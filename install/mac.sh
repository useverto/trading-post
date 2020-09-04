set -e

if ! command -v unzip >/dev/null; then
  echo "Error: unzip is required to install Verto Trading Post." 1>&2
  exit 1
fi

if [ $# -eq 0 ]; then
  release_uri="https://github.com/useverto/trading-post/releases/latest/download/verto-x64-macos.zip"
else
  release_uri="https://github.com/useverto/trading-post/releases/download/${1}/verto-x64-macos.zip"
fi

install_dir="${VERTO_INSTALL:-$HOME/.verto}"
bin_dir="$install_dir"
exe="$bin_dir/verto"

if [ ! -d "$bin_dir" ]; then
  mkdir -p "$bin_dir"
fi

curl -#L -o "$exe.zip" "$release_uri"
cd "$bin_dir"
unzip -o "$exe.zip"
chmod +x "$exe"
rm "$exe.zip"

echo "Verto Trading Post was installed successfully to $exe"
if command -v verto >/dev/null; then
  echo "Run 'verto --help' to get started"
else
  case $SHELL in
  /bin/zsh) shell_profile=".zshrc" ;;
  *) shell_profile=".bash_profile" ;;
  esac
  echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
  echo "  export VERTO_INSTALL=\"$install_dir\""
  echo "  export PATH=\"\$VERTO_INSTALL:\$PATH\""
  echo "Run '$exe --help' to get started"
fi
