#!/bin/bash
export SUPABASE_URL="$(grep '^SUPABASE_URL' .env | cut -d= -f2 | tr -d ' \r')"
export SUPABASE_KEY="$(grep '^SUPABASE_KEY' .env | cut -d= -f2 | tr -d ' \r')"

# Start ngrok and capture URL
python3 -c "
from pyngrok import conf, ngrok
import time
import os
conf.get_default().auth_token = os.environ['NGROK_AUTHTOKEN']
tunnel = ngrok.connect(8000)
url = tunnel.public_url
print(f'NGROK URL: {url}')
print(f'')
print(f'NOW UPDATE VERCEL:')
print(f'  vercel env rm VITE_API_URL production')
print(f'  echo \"{url}\" | vercel env add VITE_API_URL production')
print(f'  cd .. && npm run build && vercel --prod')
" &

sleep 4
uvicorn main:app --port 8000 --reload
