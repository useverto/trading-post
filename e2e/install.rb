require_relative "logger"

def install
		if OS.unix?
			exec_cmd('curl -fsSL http://localhost:3000/install/linux.sh | sh')
		else
			exec_cmd('pwsh -c "iwr http://localhost:3000/install/windows.ps1 | iex"')
		end
end