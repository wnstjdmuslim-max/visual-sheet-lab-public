# Project TODO

- [x] 싱글 페이지 다크 시네마틱 인터페이스와 색감 시트·캐릭터 시트 탭 전환 구현
- [x] JPG/PNG 6~12장 다중 업로드와 드래그&드롭 구현
- [x] 업로드 이미지 순서 변경 및 썸네일 삭제 구현
- [x] 보드 컷 수 6컷 / 9컷 / 12컷 선택 구현
- [x] 이미지 표시 방식 크롭 / 원본 비율 맞춤 선택 구현
- [x] 룩 이름 입력과 자동 이름 생성 구현
- [x] HEX 8색 팔레트 추출 구현
- [x] MOOD / EXPOSURE / SATURATION / CONTRAST / TEMPERATURE / COLOR BIAS 분석값 표시 구현
- [x] 1600×900 PNG 룩 보드 미리보기와 내보내기 구현
- [x] 캐릭터 시트 플랫폼 선택 Universal / GPT / Midjourney 구현
- [x] 캐릭터 시트 룩 강도 선택 Subtle / Strong / Heavy 구현
- [x] 캐릭터 설명 필수 입력과 시대/국가·직업/배경·성격/감정·체형/자세·의상 디테일 선택 입력 구현
- [x] 신발·후면·손·렌즈·마네킹방지·자연변화 옵션 체크박스 구현
- [x] FULL PROMPT / COMPACT / NEGATIVE 출력 모드 구현
- [x] 각 프롬프트 모드 클립보드 복사 구현
- [x] 프로젝트별 색감 시트·캐릭터 시트 라이브러리 저장 구현
- [x] 저장된 라이브러리 조회와 삭제 구현
- [x] 대표 색감 입력 사례로 팔레트·분석값·룩 보드 출력 검증
- [x] 대표 캐릭터 입력 사례로 FULL PROMPT·COMPACT·NEGATIVE 출력 검증
- [x] Vitest 단위 테스트 작성 및 전체 테스트 실행
- [x] 브라우저 화면과 반응형 레이아웃 시각 검증

## Follow-up verification gaps

- [x] 분석 완료 후 룩 이름을 자동 생성하고 수동 재생성 트리거 제공
- [x] 색감 시트 분석을 6~12장 범위로 엄격히 검증하고 6장 미만 상태 안내 추가
- [x] 라이브러리에 프로젝트명과 프로젝트별 저장·조회·삭제 구조 추가
- [x] 실제 대표 레퍼런스 이미지 세트로 팔레트·분석값·PNG 보드 결과 검증
- [x] 모바일 및 태블릿 뷰포트에서 반응형 화면 검증 및 수정
- [x] 업로드 제한·프롬프트 생성·라이브러리 저장/삭제·보드 export 의미 있는 테스트 추가

## Final verification refinements

- [x] 룩 이름 수동 재생성 버튼 또는 재생성 액션 추가
- [x] 라이브러리 프로젝트 필터와 프로젝트 단위 조회·삭제 흐름 추가
- [x] PNG export 결과를 검증 가능한 상태로 확인
- [x] 태블릿 뷰포트 캡처 및 레이아웃 검증
- [x] 프롬프트 생성·라이브러리 저장/삭제·보드 export 로직 테스트 추가

## Evidence refinements

- [x] PNG export 결과 파일 생성 여부를 확인할 수 있는 검증 경로 마련
- [x] 라이브러리 저장·삭제의 localStorage 반영과 canvas PNG 다운로드를 테스트

- [x] 프로젝트 삭제 결과가 localStorage에도 반영되는지 테스트

## Audit and data-foundation review

- [x] 현재 색감 분석·캐릭터 프롬프트·룩 보드 결과 생성 로직을 코드 기준으로 문서화
- [x] 참고 사이트에서 실제 입력 이미지와 결과값을 수집했는지 여부 확인
- [x] 현재 입력 사례의 종류·장수·저장 위치 확인
- [x] 참고 결과 데이터셋을 계속 누적할 수 있는 저장 구조와 필요한 변경사항 설계

## Film Grab benchmark sync implementation

- [x] Film Grab 기준 데이터 테이블과 마이그레이션 추가
- [x] 10개 영화×9장 이미지 URL과 색감 분석 결과를 DB에 적재
- [x] 기준 데이터 조회 tRPC 절차와 Visual Sheet Lab 동기화 UI 추가
- [x] DB 적재 수량·중복 방지·조회 결과 검증

## True Film Grab sync

- [x] Film Grab 기준 스냅샷을 서버 동기화 데이터로 등록
- [x] DB UPSERT를 실행하는 filmGrab.sync mutation 추가
- [x] SYNC 버튼을 실제 UPSERT 후 목록 재조회 흐름으로 연결
- [x] 동기화 성공·실패 상태와 적재 수량 표시

## Extend Film Grab library to 60 films

- [x] Film Grab에서 추가 영화 50개와 영화별 원본 갤러리 9장 선정
- [x] 추가 50개 영화의 팔레트·색감 분석 결과 생성
- [x] 60개 영화 기준 스냅샷과 DB 동기화 범위 확장
- [x] 영화 카드 클릭 상세 팝업 구현
- [x] 팝업에 대표 이미지·9장 레퍼런스·상세 색감 분석·HEX 팔레트 표시
- [x] 60개 데이터와 팝업의 데스크톱·모바일 동작 검증

## Final browser evidence

- [x] 모바일 뷰포트에서 60개 카드 그리드와 상세 팝업의 열림·스크롤·닫기 검증
- [x] 데스크톱에서 카드 클릭 후 대표 이미지·9장·분석값·팔레트 표시 검증

## Film benchmark filters

- [x] MOOD 선택 필터 추가
- [x] COLOR BIAS 선택 필터 추가
- [x] MOOD와 COLOR BIAS 조합 필터 및 결과 개수 표시
- [x] 필터 초기화와 결과 없음 상태 구현
- [x] 데스크톱·모바일 필터 레이아웃과 실제 필터링 검증

## Filter interaction evidence

- [x] MOOD 필터와 COLOR BIAS 필터의 파생 옵션·조합·초기화·empty-state 순수 함수 테스트 추가
- [x] 데스크톱 필터 선택과 결과 개수·카드 목록 변경 검증
- [x] 모바일 필터 선택·초기화와 결과 상태 검증

## Film benchmark favorites

- [x] 영화 카드별 즐겨찾기 하트 버튼 추가
- [x] 즐겨찾기 상태를 localStorage에 저장하고 새로고침 후 유지
- [x] 전체 보기·즐겨찾기 모아보기 탭 추가
- [x] 즐겨찾기 모드와 MOOD·COLOR BIAS 필터 조합 지원
- [x] 즐겨찾기 추가·해제·모아보기·empty-state 테스트 및 반응형 검증

## Favorite behavior evidence

- [x] 즐겨찾기 localStorage 저장·복원과 FAVORITES 모드 필터링 순수 함수 테스트 추가
- [x] FAVORITES empty-state와 MOOD·COLOR BIAS 조합 상태 검증
- [x] 데스크톱·모바일 즐겨찾기 하트와 모아보기 렌더링 검증

## Character prompt benchmark rebuild

- [x] 첨부된 Universal Strong / Subtle / Heavy 결과의 공통 구조와 차이 분석
- [x] 얼굴·자세·의상·상호작용·보드 구역·현실성 보호 규칙 추출
- [x] 대표 캐릭터 입력 테스트 케이스와 기대 출력 3종 구성
- [x] 캐릭터 프롬프트 규칙·테스트 입력·기대 출력 DB 저장 구조 추가
- [x] Universal / GPT / Midjourney 및 Subtle / Strong / Heavy 로직 반영
- [x] FULL PROMPT / COMPACT / NEGATIVE 출력 연결
- [x] 첨부 기준 출력과 현재 결과 비교 테스트
- [x] 캐릭터 시트 화면·저장 라이브러리·반응형 검증

## Character benchmark evidence refinements

- [x] GPT와 Midjourney 전용 프롬프트 규칙과 출력 테스트 추가
- [x] 첨부 Strong·Subtle·Heavy 결과의 핵심 문구·구조를 직접 비교하는 기준 테스트 추가
- [x] 캐릭터 시트 저장·라이브러리 반영과 모바일·태블릿 렌더링 검증

## Final character evidence

- [x] 첨부 3개 원문에서 추출한 FULL PROMPT 핵심 섹션·문구를 snapshot 기준으로 저장하고 비교
- [x] 캐릭터 입력 후 SAVE CHARACTER SHEET과 라이브러리 항목 생성 흐름 검증
- [x] 태블릿 캐릭터 시트 레이아웃과 저장 후 라이브러리 표시 검증

## Character verification completion

- [x] 첨부 결과와 직접 대조 가능한 Strong·Subtle·Heavy snapshot fixture 추가
- [x] 캐릭터 저장 결과를 재현하는 순수 저장 결과 테스트 추가
- [x] 저장된 캐릭터 시트가 보이는 모바일·태블릿 상태 캡처 추가

## Publishing request

- [x] 퍼블리시 전 상태 점검 및 최신 체크포인트 저장
- [x] 관리 화면의 Publish 버튼으로 공개 배포 안내
