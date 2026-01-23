import sys
from rembg import remove
from PIL import Image
import io

def main():
    try:
        # Read from stdin
        input_data = sys.stdin.buffer.read()
        if not input_data:
            print("No input data", file=sys.stderr)
            sys.exit(1)

        # Process image
        result = remove(input_data)

        # Write to stdout
        sys.stdout.buffer.write(result)
        sys.stdout.buffer.flush()

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
