"""Run a command against a fresh, disposable loopback PostgreSQL database.

On Windows invoke through run-resource-bounded.py so PostgreSQL and every test
child share the same CPU/memory budget. Requires PostgreSQL binaries on PATH or
--pg-bin. No existing DATABASE_URL is used. Credentials live only for this run.
"""
import argparse
import ctypes
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", type=Path)
    parser.add_argument("--skip-migrate", action="store_true")
    parser.add_argument("--database-name", default="ledgerbyte_local_proof")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("Expected a command after --")
    if not re.fullmatch(r"ledgerbyte_[a-z0-9_]{1,45}", args.database_name) or not any(word in args.database_name for word in ("proof", "test")):
        parser.error("Database name must be an explicit ledgerbyte_ proof/test name")
    if os.name == "nt":
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        kernel.IsProcessInJob.argtypes = [wintypes.HANDLE, wintypes.HANDLE, ctypes.POINTER(wintypes.BOOL)]
        inside = wintypes.BOOL()
        if not kernel.IsProcessInJob(kernel.GetCurrentProcess(), None, ctypes.byref(inside)) or not inside.value:
            parser.error("Run this harness inside scripts/run-resource-bounded.py")
    repository = Path(__file__).resolve().parent.parent
    parent = (repository / ".dev-logs" / "local-postgres").resolve()
    parent.mkdir(parents=True, exist_ok=True)
    run_dir = Path(tempfile.mkdtemp(prefix="proof-", dir=parent)).resolve()
    password = secrets.token_urlsafe(32)
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    environment = os.environ.copy()
    if args.pg_bin:
        environment["PATH"] = str(args.pg_bin.resolve()) + os.pathsep + environment["PATH"]
    environment.update(PGPASSWORD=password, PGUSER="postgres", PGHOST="127.0.0.1")

    def execute(argv, *, check=True):
        executable = shutil.which(str(argv[0]), path=environment["PATH"])
        if not executable:
            raise RuntimeError(f"Executable not found: {argv[0]}")
        if Path(executable).stem == "pg_ctl":
            # A daemon can inherit pipe handles even after pg_ctl exits. A file
            # avoids waiting forever for the server to close our output pipe.
            output = run_dir / f"pg-control-{secrets.token_hex(4)}.log"
            with output.open("w", encoding="utf-8") as stream:
                result = subprocess.run([executable, *map(str, argv[1:])], cwd=repository,
                                        env=environment, stdout=stream, stderr=subprocess.STDOUT,
                                        creationflags=flags).returncode
            print(output.read_text(encoding="utf-8", errors="replace").replace(password, "[REDACTED]"), end="", flush=True)
            if check and result:
                raise RuntimeError(f"{Path(executable).name} exited {result}")
            return result
        process = subprocess.Popen([executable, *map(str, argv[1:])], cwd=repository, env=environment,
                                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   text=True, encoding="utf-8", errors="replace", creationflags=flags)
        for line in process.stdout:
            print(line.replace(password, "[REDACTED]"), end="", flush=True)
        result = process.wait()
        if check and result:
            raise RuntimeError(f"{Path(executable).name} exited {result}")
        return result

    started = False
    try:
        with socket.socket() as candidate:
            candidate.bind(("127.0.0.1", 0))
            port = candidate.getsockname()[1]
        environment["PGPORT"] = str(port)
        password_file = run_dir / "initial-password"
        password_file.write_text(password, encoding="utf-8")
        try:
            execute(["initdb", "-D", run_dir / "data", "-U", "postgres", "--auth=scram-sha-256",
                     "--pwfile", password_file, "--encoding=UTF8", "--locale=C"])
        finally:
            password_file.unlink(missing_ok=True)
        config = run_dir / "data" / "postgresql.conf"
        with config.open("a", encoding="utf-8") as stream:
            stream.write(f"\nlisten_addresses='127.0.0.1'\nport={port}\nshared_buffers='128MB'\n"
                         "work_mem='8MB'\nmaintenance_work_mem='64MB'\nmax_connections=20\n"
                         "max_worker_processes=2\nmax_parallel_workers=0\nmax_parallel_workers_per_gather=0\n"
                         "log_statement='none'\n")
        execute(["pg_ctl", "-D", run_dir / "data", "-l", run_dir / "postgres.log", "-w", "start"])
        started = True
        execute(["createdb", args.database_name])
        url = f"postgresql://postgres:{password}@127.0.0.1:{port}/{args.database_name}?schema=public&connection_limit=8"
        environment.update(DATABASE_URL=url, DIRECT_URL=url, INVENTORY_TEST_DATABASE_URL=url,
                           LEDGERBYTE_TEST_DATABASE_URL=url,
                           LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION="true")
        environment["PGDATABASE"] = args.database_name
        print(f"[local-postgres] disposable database ready on loopback port {port}", flush=True)
        if not args.skip_migrate:
            corepack = shutil.which("corepack", path=environment["PATH"])
            if os.name == "nt" and corepack:
                execute(["node", Path(corepack).parent / "node_modules/corepack/dist/corepack.js", "pnpm",
                         "--dir", "apps/api", "exec", "prisma", "migrate", "deploy"])
            else:
                execute(["corepack", "pnpm", "--dir", "apps/api", "exec", "prisma", "migrate", "deploy"])
        return execute(command, check=False)
    finally:
        if started:
            execute(["pg_ctl", "-D", run_dir / "data", "-m", "fast", "-w", "stop"], check=False)
        # Resolve and validate the complete target before any recursive removal.
        if run_dir.parent != parent or not run_dir.name.startswith("proof-"):
            raise RuntimeError("Refusing cleanup outside the disposable proof directory")
        shutil.rmtree(run_dir)
        print("[local-postgres] disposable cluster removed", flush=True)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError) as error:
        print(f"[local-postgres] {error}", file=sys.stderr)
        sys.exit(1)
