from services.scraper import load_article, chunk_article

text = load_article("https://www.vrt.be/vrtnws/nl/2026/02/22/soedan-sluitstuk/")
chunks = chunk_article(text)

print(f"Totaal tekens: {len(text)}")
print(f"Aantal chunks: {len(chunks)}")
for i, chunk in enumerate(chunks[:3]):
    print(f"\n--- Chunk {i+1} ---\n{chunk}")

