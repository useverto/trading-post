require_relative "logger"

def install
		if OS.unix?
			exc('curl -fsSL http://localhost:3000/install/linux.sh | sh')
		else
			exc('iwr https://verto.exchange/i/windows | iex')
		end
end