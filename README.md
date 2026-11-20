# XF 『신스에테르0』 테스트 빌드 v0.5.0

기획서(projactXF_신스에테르0, 연대기, 등장인물 능력 체계, xf 셀)를 바탕으로 만든 3인칭 백뷰 액션 JRPG 테스트 버전.
외부 라이브러리 없이 WebGL로 직접 그리므로 GitHub Pages에 폴더째 올리면 바로 실행됩니다.

## 구조
- `index.html` — 화면 구조(HUD·메뉴·터치 버튼)만
- `css/style.css` — 디자인
- `js/assets/` — **에셋 (나중에 추가·교체)**
  - `avatars.js` 아바타 외형 · `weapons.js` 무기 · `effects.js` 스킬·전투 이펙트 · `background.js` 배경(색감·소품·조명·안개)
  - 각 파일 맨 위 주석에 추가 방법
- `js/data.js` — 기획서 데이터(캐릭터·기술·조력자·적·연대기) ← 수치 조정은 여기서
- `js/engine.js` 렌더러 · `js/actors.js` 공통 인체 리그/포즈/애니메이션 · `js/world.js` 제1지역 배치·충돌
- `js/game.js` 전투·싱크로 게이지·적 AI·보스 · `js/ui.js` HUD/메뉴 · `js/input.js` 조작 · `js/audio.js` 효과음 · `js/main.js` 부팅

## 버전 갱신
`js/data.js`의 `XF.VERSION`과 `index.html`의 `?v=` 값을 함께 올리면 브라우저 캐시 문제 없이 새 버전이 적용됩니다.

변경 내역은 `updates.json` 참고.
