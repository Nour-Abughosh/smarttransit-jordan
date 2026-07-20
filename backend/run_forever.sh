#!/bin/bash
export SUPABASE_URL="$(grep '^SUPABASE_URL' .env | cut -d= -f2 | tr -d ' \r')"
export SUPABASE_KEY="$(grep '^SUPABASE_KEY' .env | cut -d= -f2 | tr -d ' \r')"

cd /root/trial/backend
source /root/miniconda3/etc/profile.d/conda.sh
conda activate st_env

while true; do
    echo "Starting backend at $(date)"
    uvicorn main:app --host 0.0.0.0 --port 8000
    echo "Backend died, restarting in 3s..."
    sleep 3
done
