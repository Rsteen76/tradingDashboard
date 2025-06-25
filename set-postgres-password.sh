#!/bin/bash

echo "PostgreSQL Password Setup"
echo "========================"
echo ""
echo "The database setup failed because the default password 'password' doesn't match your PostgreSQL installation."
echo ""
echo "Please enter your PostgreSQL password for user 'postgres':"
read -s password
echo ""

export DB_PASSWORD="$password"
echo "Password set for this session."
echo ""
echo "Now run the startup script:"
echo "  ./start-complete-system-bash.sh"
echo ""
echo "Or run database setup manually:"
echo "  node setup-database.js" 