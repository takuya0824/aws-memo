## Summary
- 

## Test plan
- [ ] backend: `pytest backend/tests/ -v`
- [ ] frontend: `npm run build`
- [ ] 手動確認（該当する場合）: ローカル `docker compose up --build` で動作確認

## Notes
- backend のテストと frontend のビルドは、main / develop 向けの PR でも CI で実行される（デプロイは main への push 時のみ）
