build:
	docker build -t mcp-farma-access .

run:
	docker run -p 6937:6937 mcp-farma-access

stop:
	docker stop mcp-farma-access

clean:
	docker rm mcp-farma-access