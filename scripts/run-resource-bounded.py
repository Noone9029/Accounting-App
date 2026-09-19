"""Run a Windows command with an inherited 18 GiB / 50% CPU job limit.

Usage: python scripts/run-resource-bounded.py -- node ...
Children are created suspended, assigned to the job, then resumed. No process
can spawn outside the budget before assignment. Closing the job kills its tree.
Still pass explicit, conservative concurrency flags to the invoked tool.
"""
import ctypes
from ctypes import wintypes as w
import os
import subprocess
import sys


def run(argv):
    if os.name != "nt":
        raise SystemExit("This runner requires Windows Job Objects; no unbounded fallback.")
    if not argv:
        raise SystemExit("Expected an executable and arguments after --")
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    size = ctypes.c_size_t
    ulong64 = ctypes.c_ulonglong

    class BasicLimits(ctypes.Structure):
        _fields_ = [("process_time", ctypes.c_longlong), ("job_time", ctypes.c_longlong),
                    ("flags", w.DWORD), ("min_working_set", size), ("max_working_set", size),
                    ("active_limit", w.DWORD), ("affinity", size),
                    ("priority", w.DWORD), ("scheduling", w.DWORD)]

    class IoCounters(ctypes.Structure):
        _fields_ = [(key, ulong64) for key in ("read_ops", "write_ops", "other_ops", "read_bytes", "write_bytes", "other_bytes")]

    class ExtendedLimits(ctypes.Structure):
        _fields_ = [("basic", BasicLimits), ("io", IoCounters), ("process_memory", size),
                    ("job_memory", size), ("peak_process", size), ("peak_job", size)]

    class CpuRate(ctypes.Structure):
        _fields_ = [("flags", w.DWORD), ("rate", w.DWORD)]

    class StartupInfo(ctypes.Structure):
        _fields_ = [("cb", w.DWORD), ("reserved", w.LPWSTR), ("desktop", w.LPWSTR),
                    ("title", w.LPWSTR), ("x", w.DWORD), ("y", w.DWORD),
                    ("x_size", w.DWORD), ("y_size", w.DWORD), ("x_chars", w.DWORD),
                    ("y_chars", w.DWORD), ("fill", w.DWORD), ("flags", w.DWORD),
                    ("show", w.WORD), ("reserved_size", w.WORD), ("reserved2", ctypes.c_void_p),
                    ("stdin", w.HANDLE), ("stdout", w.HANDLE), ("stderr", w.HANDLE)]

    class ProcessInfo(ctypes.Structure):
        _fields_ = [("process", w.HANDLE), ("thread", w.HANDLE), ("pid", w.DWORD), ("tid", w.DWORD)]

    declarations = {
        "CreateJobObjectW": ([ctypes.c_void_p, w.LPCWSTR], w.HANDLE),
        "SetInformationJobObject": ([w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD], w.BOOL),
        "QueryInformationJobObject": ([w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD, ctypes.c_void_p], w.BOOL),
        "AssignProcessToJobObject": ([w.HANDLE, w.HANDLE], w.BOOL),
        "CreateProcessW": ([w.LPCWSTR, w.LPWSTR, ctypes.c_void_p, ctypes.c_void_p, w.BOOL, w.DWORD,
                            ctypes.c_void_p, w.LPCWSTR, ctypes.POINTER(StartupInfo), ctypes.POINTER(ProcessInfo)], w.BOOL),
        "GetStdHandle": ([w.DWORD], w.HANDLE),
        "SetHandleInformation": ([w.HANDLE, w.DWORD, w.DWORD], w.BOOL),
        "GetHandleInformation": ([w.HANDLE, ctypes.POINTER(w.DWORD)], w.BOOL),
        "ResumeThread": ([w.HANDLE], w.DWORD),
        "WaitForSingleObject": ([w.HANDLE, w.DWORD], w.DWORD),
        "GetExitCodeProcess": ([w.HANDLE, ctypes.POINTER(w.DWORD)], w.BOOL),
        "TerminateProcess": ([w.HANDLE, w.UINT], w.BOOL),
        "CloseHandle": ([w.HANDLE], w.BOOL),
    }
    for name, (args, result) in declarations.items():
        function = getattr(kernel, name)
        function.argtypes, function.restype = args, result

    def checked(result):
        if not result:
            raise ctypes.WinError(ctypes.get_last_error())
        return result

    job = checked(kernel.CreateJobObjectW(None, None))
    process = ProcessInfo()
    handle_flags = []
    try:
        limits = ExtendedLimits()
        # JOB_OBJECT_LIMIT_JOB_MEMORY | JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        limits.basic.flags = 0x200 | 0x2000
        # Leave headroom below the project's aggregate 20 GB ceiling for this
        # small supervisor and tooling outside the child job.
        limits.job_memory = 18 * 1024 ** 3
        checked(kernel.SetInformationJobObject(job, 9, ctypes.byref(limits), ctypes.sizeof(limits)))
        # ENABLE | HARD_CAP, in hundredths of one percent of total machine CPU.
        cpu = CpuRate(0x1 | 0x4, 5000)
        checked(kernel.SetInformationJobObject(job, 15, ctypes.byref(cpu), ctypes.sizeof(cpu)))
        startup = StartupInfo()
        startup.cb = ctypes.sizeof(startup)
        startup.flags = 0x100  # STARTF_USESTDHANDLES
        for field, identifier in (("stdin", -10), ("stdout", -11), ("stderr", -12)):
            handle = kernel.GetStdHandle(identifier & 0xFFFFFFFF)
            checked(handle)
            previous = w.DWORD()
            checked(kernel.GetHandleInformation(handle, ctypes.byref(previous)))
            handle_flags.append((handle, previous.value))
            checked(kernel.SetHandleInformation(handle, 1, 1))
            setattr(startup, field, handle)
        command = ctypes.create_unicode_buffer(subprocess.list2cmdline(argv))
        checked(kernel.CreateProcessW(None, command, None, None, True, 0x4 | 0x08000000,
                                      None, os.getcwd(), ctypes.byref(startup), ctypes.byref(process)))
        if not kernel.AssignProcessToJobObject(job, process.process):
            error = ctypes.WinError(ctypes.get_last_error())
            kernel.TerminateProcess(process.process, 1)
            raise error
        ceiling = max(1, (os.cpu_count() or 1) // 2)
        print(f"[bounded] pid={process.pid} aggregateMemoryGiB=18 cpuPercent=50 workerCeiling={ceiling}", flush=True)
        if kernel.ResumeThread(process.thread) == 0xFFFFFFFF:
            raise ctypes.WinError(ctypes.get_last_error())
        while True:
            waited = kernel.WaitForSingleObject(process.process, 250)
            if waited == 0:
                break
            if waited != 0x102:
                raise ctypes.WinError(ctypes.get_last_error())
        status = w.DWORD()
        checked(kernel.GetExitCodeProcess(process.process, ctypes.byref(status)))
        checked(kernel.QueryInformationJobObject(job, 9, ctypes.byref(limits), ctypes.sizeof(limits), None))
        print(f"[bounded] exit={status.value} peakJobMiB={limits.peak_job / 1024 ** 2:.1f}", flush=True)
        return status.value
    finally:
        for handle, flags in handle_flags:
            kernel.SetHandleInformation(handle, 1, flags & 1)
        for handle in (process.thread, process.process, job):
            if handle:
                kernel.CloseHandle(handle)


if __name__ == "__main__":
    arguments = sys.argv[1:]
    if arguments[:1] == ["--"]:
        arguments = arguments[1:]
    try:
        sys.exit(run(arguments))
    except KeyboardInterrupt:
        sys.exit(130)
