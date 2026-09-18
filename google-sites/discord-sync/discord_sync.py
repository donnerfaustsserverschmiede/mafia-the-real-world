"""
MAFIVERA Discord -> Google Sites bridge.

This listener watches one Discord channel by NAME and forwards new messages
to the Google Apps Script web-app endpoint.

Environment variables:
  DISCORD_BOT_TOKEN
  MAFIVERA_SITES_WEBAPP_URL
  MAFIVERA_SITES_SYNC_SECRET

Required Discord bot intent:
  Message Content Intent

Install:
  pip install discord.py requests
"""

import os
import requests
import discord

CHANNEL_NAME = "was-noch-kommt"

TOKEN = os.environ["DISCORD_BOT_TOKEN"]
WEBAPP_URL = os.environ["MAFIVERA_SITES_WEBAPP_URL"]
SYNC_SECRET = os.environ["MAFIVERA_SITES_SYNC_SECRET"]

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f"MAFIVERA sync online als {client.user}")

@client.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return
    if message.channel.name != CHANNEL_NAME:
        return

    text = message.content.strip()
    if not text:
        return

    payload = {
        "secret": SYNC_SECRET,
        "text": text[:4000],
        "author": message.author.display_name[:120],
    }

    try:
        response = requests.post(WEBAPP_URL, json=payload, timeout=15)
        print("Website sync:", response.status_code, response.text[:500])
    except Exception as exc:
        print("Website sync error:", exc)

client.run(TOKEN)
