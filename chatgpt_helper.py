from openai import OpenAI

# 🔑 pegá tu API key acá (la conseguís en https://platform.openai.com/)
client = OpenAI(api_key="TU_API_KEY")

def pedir_codigo(prompt):
    response = client.chat.completions.create(
        model="gpt-5",  # o "gpt-4.1" si no tenés acceso a 5 todavía
        messages=[
            {"role": "system", "content": "Sos un asistente que genera solo código limpio."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content