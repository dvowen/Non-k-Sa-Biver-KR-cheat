# Non-k Sa-BIVER KR v0.7 패치 내역

- 작성일: 2026-07-12
- 원작 기준 버전: v0.7
- 원작 경로: `https://funa-funa.sakura.ne.jp/202605testtest050v7/`
- 한글화 브랜치: `chore/v0.7-localization`

## 요약

기존 v0.6 정적 미러를 원작 v0.7 파일로 교체하고, 이전 번역을 다시 적용한 뒤 v0.7에서 추가된 대사와 UI 문구를 번역했다. 향후 버전 교체를 반복할 수 있도록 원작 캡처, 자산 수집, 번역 적용, 미번역 감사, GitHub Pages 빌드 과정을 함께 정비했다.

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 원작 기준 버전 | v0.6 | v0.7 |
| 사이트 버전 경로 | `202604testtes004v6` | `202605testtest050v7` |
| 통합 번역 메모리 | 794개 | 903개 (+109개) |
| 원본 JavaScript 청크 | v0.6 구성 | v0.7 구성 27개 |
| 공개 배포 대상 | v0.6 | v0.7만 포함 |

## 한글화 변경

- 기존 v0.6 번역을 v0.7 원본 청크에 다시 적용했다.
- 알베르트와 타간 관련 신규 대사 및 이벤트 문구를 번역했다.
- 신규 이벤트 제목, 전투 결과 문구, UI 문구를 번역했다.
- 다음 신규 무기와 아이템 명칭 및 설명을 번역했다.

  - 사냥꾼의 중력 그물
  - 수호 위스프
  - 뇌광 투창
  - 반중력 바람총
  - 짐승 퇴치 뿔피리

- 캐릭터 표기는 `알베르트`, `타간`, `소디오`로 통일했다.
- 동적 전투 결과 문장은 `${...}` 표현식을 보존하면서 문장 전체를 치환하도록 변경했다. `分`처럼 짧은 글자 조각이 다른 코드까지 바꾸는 문제를 막았다.
- 최종 적용 결과는 번역 903개, 실제 치환 1,204곳이며 번역 대상 일본어 감사 결과는 0건이다.

## 원작 파일과 자산 갱신

- v0.7 시작 HTML에서 직접 참조하는 청크뿐 아니라 16자리 해시 형태의 지연 로딩 청크까지 재귀적으로 수집한다.
- 원작 HTML, JavaScript, CSS, 폰트, 파비콘을 새 버전 경로에 저장한다.
- 다시 캡처할 때 이전 해시 청크와 미디어 파일을 먼저 정리해 오래된 파일이 섞이지 않게 했다.
- 게임에서 참조하는 자산 246개를 확인했으며 실제 누락은 0개다.
- 원작 코드가 참조하지만 원작 서버에도 존재하지 않는 다음 5개 경로는 별도로 기록하고 배포 실패 대상에서 제외했다.

  - `/assets/A-01aaegao01.png`
  - `/assets/A-01aanomal.png`
  - `/assets/cg/test01.png`
  - `/assets/icons/potion01.png`
  - `/assets/ui/pattern.png`

## 저장 데이터 호환성

- 로컬 저장 키 `loot_and_link_save_v1`을 유지한다.
- 저장 데이터 스키마 버전은 기존과 같은 `1`이다.
- v0.6 세이브 관리 페이지를 v0.7 경로로 옮기고 게임 복귀 링크를 갱신했다.
- 자동 테스트에서 저장 키와 스키마가 유지되는지 확인한다. 다만 업데이트 전 사용자가 세이브를 내보내 백업하는 것을 권장한다.

## 빌드 및 배포 변경

- `scripts/version-config.mjs`에 원작 주소, 버전 경로, 사이트 디렉터리, GitHub Pages 기본 경로를 한곳에 모았다.
- GitHub Pages 빌드가 `site` 전체가 아닌 현재 v0.7 디렉터리만 복사하도록 바꿨다. 로컬에 남은 v0.6 폴더가 배포 산출물에 섞이지 않는다.
- 루트 접속 시 v0.7 경로로 이동한다.
- 공개 빌드에서 디버그 도구가 노출되지 않는지 자동 검사한다.
- Pages 워크플로에서 전체 테스트, 번역 적용, 미번역 감사 후 빌드하도록 배포 게이트를 강화했다.

## 2026-07-12 검증 결과

| 검사 | 결과 |
| --- | --- |
| Node 테스트 파일 | 9개 통과 |
| 통합 번역 | 903개 |
| 실제 번역 치환 | 1,204곳 |
| 번역 대상 미번역 일본어 | 0건 |
| 확인 자산 | 246개 |
| 실제 누락 자산 | 0개 |
| 알려진 원작 측 미존재 참조 | 5개 |
| Pages 빌드 | 통과 |
| v0.6 산출물 혼입 | 없음 |
| 공개 디버그 도구 | 없음 |

로컬 테스트 서버에서 다음 경로가 모두 HTTP 200을 반환하는 것도 확인했다.

- v0.7 게임 시작 화면
- 세이브 관리 페이지
- 번역이 적용된 JavaScript 청크
- v0.7 CG 자산

## 유지보수용 재배포 순서

원작이 다시 업데이트되면 `scripts/version-config.mjs`의 버전 정보를 먼저 바꾼 뒤 아래 순서로 진행한다.

```sh
node scripts/capture-upstream.mjs
node scripts/download-assets.mjs
node scripts/extract-strings.mjs
node scripts/extract-japanese.mjs
# translate/*.tsv에 신규 번역 추가
node scripts/merge-translations.mjs
node scripts/apply-translations.mjs
node scripts/audit-translations.mjs
node --test scripts/*.test.mjs serve-local.test.mjs
node scripts/build-github-pages.mjs
```

각 단계가 끝날 때 관련 파일만 골라 Git 커밋으로 저장한다. 권장 커밋 단위는 캡처 도구, 원작 미러, 번역, 배포 설정, 검증 보완 순서다.

## 구현 커밋

- `3b1ab35` `build: make upstream version refresh repeatable`
- `2517574` `chore: refresh static mirror for upstream v0.7`
- `6d0c48d` `feat: localize upstream v0.7 content`
- `becc80a` `build: prepare v0.7 GitHub Pages release`
- `cd8db05` `fix: harden v0.7 refresh and release`

