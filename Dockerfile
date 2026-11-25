FROM python:3.12-slim
WORKDIR /app
COPY server.py ./
COPY web ./web
EXPOSE 8765
CMD ["python", "-u", "server.py", "--host", "0.0.0.0", "--data", "/data"]
