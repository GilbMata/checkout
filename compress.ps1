# Remove node_modules, .next, .git folders and lock files
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".git" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".opencode" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".playwright-mcp" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vscode" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "station.db" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "sqlite.db" -Force -ErrorAction SilentlyContinue

# Compress the project
Compress-Archive -Path * -DestinationPath "C:\Users\GilMata\Desktop\station\station.zip" -Force

Write-Host "Compressed to station.zip successfully!"
