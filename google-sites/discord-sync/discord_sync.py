"""
MAFIVERA Discord -> Google Sites bridge.

The bot watches one dedicated Discord channel and forwards the newest
message to the Google Apps Script web app.

Environment variables:
  DISCORD_BOT_TOKEN
  MAFIVERA_SITES_WEBAPP_URL
  MAFIVERA_SITES_SYNC_SECRET

Optional:
  MAFIVERA_DISCORD_CHANNEL_ID
  MAFIVERA_DISCORD_CHANNEL_NAME (default: was-noch-kommt)

Required Discord bot intent:
  Message Content Intent
"""

import os
import requests
import discord

CHANNEL_NAME = os.getenv("MAFIVERA_DISCORD_CHANNEL_NAME", "was-noch-kommt")
CHANNEL_ID = 1549686033476751390

TOKEN = os.environ["DISCORD_BOT_TOKEN"]
WEBAPP_URL = os.environ["MAFIVERA_SITES_WEBAPP_URL"]
SYNC_SECRET = os.environ["MAFIVERA_SITES_SYNC_SECRET"]

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

def is_target_channel(message: discord.Message) -> bool:
    if CHANNEL_ID is not None:
        return message.channel.id == CHANNEL_ID
    return message.channel.name == CHANNEL_NAME

@client.event
async def on_ready():
    print(f"MAFIVERA sync online als {client.user}")
    if CHANNEL_ID:
        print(f"Synchronisiere Discord-Kanal-ID: {CHANNEL_ID}")
    else:
        print(f"Synchronisiere Discord-Kanal: #{CHANNEL_NAME}")

@client.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return
    if message.guild is None:
        return
    if not is_target_channel(message):
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
