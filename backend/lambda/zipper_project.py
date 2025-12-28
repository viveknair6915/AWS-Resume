import zipfile
import os

def create_zip():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_zip = os.path.join(base_dir, '../../function.zip')
    
    print(f"Creating Project Zip at: {output_zip}")
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(base_dir):
            if 'temp' in root or '__pycache__' in root:
                continue

            for file in files:
                if file.endswith('.zip') or file.endswith('.py'):
                    continue
                # We need handler.js and utils/*
                # Only exclude root-level index files (custom handlers we made earlier)
                if root == base_dir:
                    if file == 'handler_backup.js' or file == 'index.js' or file == 'index.mjs':
                        continue
                
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, base_dir)
                
                print(f"Adding {rel_path}")
                zf.write(abs_path, arcname=rel_path)
    
    # Verify
    print("\nVerifying Zip Content:")
    with zipfile.ZipFile(output_zip, 'r') as zf:
        for name in zf.namelist():
            print(f" - {name}")

if __name__ == '__main__':
    create_zip()
