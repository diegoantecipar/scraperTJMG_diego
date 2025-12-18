module.exports = {
	apps: [
		{
			name: "scraper-api",
			script: "./index.js",
			env: {
				NODE_ENV: "development",
				PORT: 3001,
			},
			env_production: {
				NODE_ENV: "production",
				PORT: 3001,
			},
			error_file: "./logs/api-err.log",
			out_file: "./logs/api-out.log",
			log_file: "./logs/api-combined.log",
			time: true,
			max_restarts: 10,
			min_uptime: "10s",
		},
		{
			name: "scraper-queue",
			script: "./queue/index.js",
			env: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
			error_file: "./logs/queue-err.log",
			out_file: "./logs/queue-out.log",
			log_file: "./logs/queue-combined.log",
			time: true,
			max_restarts: 10,
			min_uptime: "10s",
		},
	],
};
