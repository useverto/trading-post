require_relative 'logger'
require_relative 'os'
require_relative 'install'

require 'webrick'
require 'open3'


def setup_contract
	File.write('./src/utils/constants.yml', '
exchangeContractSrc: fE2OcfjlS-sHqG5K8QvxE8wHtcqKxS-YV0bDEgxo-eI
exchangeWallet: aLemOhg9OGovn-0o4cOCbueiHT9VgdYnpJpq7NgMA1A
maxInt: 2147483647')
end

def serve
	WEBrick::HTTPServer.new(:Port => 3000, :DocumentRoot => Dir.pwd, :Logger => WEBrick::Log.new("/dev/null"),
	  :AccessLog => []).start
end

def build
	exec_cmd("yarn pkg")
end

def setup_keyfile
	File.write('./arweave-keyfile.json', ENV['KEYFILE'])
end

def zip
	if OS.unix?
		exec_cmd('bash -c "sqlite3=$(find . -name node_sqlite3.node)
cp $sqlite3 ./node_sqlite3.node
zip -r verto.zip verto README.md LICENSE node_sqlite3.node
rm ./node_sqlite3.node"')
	else
		exec_cmd('pwsh -c "$sqlite3=$(gci -filter "node_sqlite3.node" -af -s -name)
Compress-Archive -CompressionLevel Optimal -Force -Path verto.exe, README.md, LICENSE, $sqlite3 -DestinationPath verto.zip"')
	end
end

puts "VERTO INTEGRATION TEST SUITE 1.0".green.bold

ENV['VERTO_URI'] = 'http://localhost:3000/verto.zip'

Thread.new {serve()}
setup_contract()
build()
zip()
install()
setup_keyfile()
exc('./verto orders -c verto.config.example.json')
exc('./verto')
exc('node ./test/integration/lib.js')
