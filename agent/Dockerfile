FROM python:3.12-slim
WORKDIR /app
COPY runner.py config.json requirements.txt ./
RUN useradd --system --uid 10001 agentuser && mkdir -p /app/state && chown -R agentuser:agentuser /app
USER agentuser
CMD ["python", "runner.py", "--once"]
