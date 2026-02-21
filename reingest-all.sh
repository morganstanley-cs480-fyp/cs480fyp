#!/bin/bash

exceptions=(
  "77194044:20001001"
  "60724962:20002001"
  "86836834:20003001"
  "77186642:20004001"
  "61270683:20005001"
  "98962729:20006001"
  "25399440:20007001"
  "53850480:20008001"
  "89369810:20009001"
  "99202386:20010001"
  "69269882:20011001"
  "42511774:20012001"
  "48712564:20013001"
  "14355627:20014001"
  "88531321:20015001"
  "54146216:20016001"
  "72427554:20017001"
  "56535550:20018001"
  "67515456:20019001"
  "81930671:20020001"
  "64737734:20021001"
  "69755320:20022001"
  "66663488:20023001"
  "15706882:20024001"
  "96904486:20025001"
  "49964172:20026001"
  "42668494:20027001"
  "98159040:20028001"
  "27625806:20029001"
  "36106022:20030001"
)

for pair in "${exceptions[@]}"; do
  trade_id="${pair%%:*}"
  exception_id="${pair##*:}"
  
  echo "Ingesting trade_id: $trade_id, exception_id: $exception_id"
  curl -X POST http://localhost:8004/documents/ingest-exception \
    -H "Content-Type: application/json" \
    -d "{\"trade_id\": \"$trade_id\", \"exception_id\": \"$exception_id\"}"
  echo ""
  sleep 0.5  # Small delay to avoid overwhelming the service
done

echo "All exceptions re-ingested!"