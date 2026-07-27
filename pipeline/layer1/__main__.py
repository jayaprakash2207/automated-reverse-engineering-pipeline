"""
Layer 1 CLI entry point.
Called by run.py as: python pipeline/layer1/pipeline.py --source <path> --output <dir>
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from layer1.pipeline import Layer1Pipeline


def main():
    parser = argparse.ArgumentParser(description="Layer 1 — deterministic source extraction")
    parser.add_argument("--source", required=True, help="Local repo path or git URL")
    parser.add_argument("--output", required=True, help="Output directory for JSON artifacts")
    parser.add_argument("--token",  default=None,  help="Git token for private repos")
    args = parser.parse_args()

    pipeline = Layer1Pipeline(
        source=args.source,
        output_dir=args.output,
        git_token=args.token,
    )
    result = pipeline.run(keep_source=False)

    if result["success"]:
        s = result["summary"]
        print("\n" + "=" * 60)
        print("LAYER 1 COMPLETE")
        print("=" * 60)
        print(f"  Language    : {s.get('language', 'unknown')}")
        print(f"  Methods     : {s.get('total_methods', 0)}")
        print(f"  Classes     : {s.get('total_classes', 0)}")
        print(f"  DB objects  : {s.get('total_db_objects', 0)}")
        print(f"  Config keys : {s.get('total_config_params', 0)}")
        print(f"  Output      : {result['output_dir']}")
        print("=" * 60)
    else:
        print(f"\nERROR: {result['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
