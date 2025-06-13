# T3 Chat

A full-stack chat application built with modern technologies.

## Project Structure

```
t3-chat/
├── backend/                 # Python backend with uv
│   ├── .python-version     # Python version specification
│   ├── main.py             # Application entry point
│   └── pyproject.toml      # Dependencies and project config
└── frontend/               # Frontend application (coming soon)
```

## Backend

The backend is built with Python and uses [uv](https://github.com/astral-sh/uv) for fast dependency management.

### Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   uv sync
   ```

3. Run the application:
   ```bash
   uv run main.py
   ```

### Development

- **Python Version**: 3.11 (specified in `.python-version`)
- **Package Manager**: uv
- **Dependencies**: Managed in `pyproject.toml`

### Adding Dependencies

```bash
cd backend
uv add <package-name>          # Add runtime dependency
uv add --dev <package-name>    # Add development dependency
```

## Frontend

Frontend setup coming soon...

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 