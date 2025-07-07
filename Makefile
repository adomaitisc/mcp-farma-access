build:
	-@docker build --no-cache -t mcp-farma-access .

run:
	-@docker run -p 6937:6937 mcp-farma-access

rmi:
	-@docker image rm mcp-farma-access