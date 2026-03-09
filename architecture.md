# AWS Cloud Island — Celesta

**CloudTrail 로그 기반 AWS 인프라 3D 시각화 플랫폼**

> 3팀  
> 작성일: 2026년 3월 8일 | 버전: v2.0

---

## 1. 프로젝트 개요

### 1.1 프로젝트 명

| 구분 | 내용 |
|------|------|
| 프로젝트명 | AWS Cloud Island (Celesta) |
| 팀명 | 3팀 |
| 핵심 주제 | AWS CloudTrail 로그 기반 인프라 3D 시각화 |
| 벤치마크 프로젝트 | Git City (thegitcity.com) — GitHub 프로필 3D 시각화 |

### 1.2 프로젝트 배경

AWS 클라우드 인프라를 운영하면 다양한 서비스(EC2, Lambda, S3, RDS 등)를 동시에 관리해야 하며, 계정 내 API 호출 활동을 직관적으로 파악하기 어렵습니다. 기존의 CloudWatch 대시보드나 CloudTrail 콘솔은 텍스트/테이블 기반으로 데이터를 보여주기 때문에, 전체 인프라의 건강 상태를 한눈에 파악하기 어렵습니다.

Git City는 GitHub 커밋 활동을 3D 픽셀 아트 빌딩으로 변환하여 직관적인 시각화를 제공합니다. 본 프로젝트는 이 컨셉을 AWS 인프라에 적용하되, 빌딩이 아닌 **구름 형태의 섬 지형**으로 표현합니다. 각 AWS 서비스의 공식 아이콘 색상을 기반으로, 서비스 활동량에 따라 해당 색상의 구름 땅이 넓어지고 두터워지는 시각화를 구현합니다.

### 1.3 핵심 목표

1. AWS CloudTrail 로그를 수집하여 3D 구름 섬 형태로 시각화
2. AWS 공식 서비스 카테고리 색상을 사용하여 서비스별 지형을 픽셀 아트로 표현
3. 서비스 활동량에 따라 해당 색상의 구름 땅이 넓어지고(면적) 두터워지는(높이) 시각화
4. IAM 사용자별 활동 비교 및 이벤트 유형별 시각적 구분

---

## 2. 핵심 시각화 컨셉

### 2.1 구름 지형 확장 방식

Git City가 "커밋 → 빌딩 높이"로 매핑한 것과 달리, Cloud Island은 **"API 활동량 → 구름 땅의 넓이와 두께"**로 매핑합니다.

**작동 원리:**
- 섬의 중앙에서 시작하여 AWS 서비스 카테고리별 구역이 배치됩니다
- 특정 서비스의 API 호출이 많아질수록 해당 색상의 픽셀 구름 지형이 바깥으로 확장되고, 층이 두터워집니다
- 활동이 적은 서비스는 얇고 좁은 구름으로, 활동이 많은 서비스는 넓고 두꺼운 구름 대지로 표현됩니다
- 각 구름 층은 픽셀 아트 스타일(복셀)로 렌더링됩니다

### 2.2 AWS 공식 서비스 카테고리 색상

AWS 공식 아키텍처 아이콘의 카테고리별 색상을 그대로 사용합니다. 출처는 AWS Labs의 공식 아이콘 리포지토리(awslabs/aws-icons-for-plantuml)입니다.

| 색상 | HEX 코드 | AWS 카테고리 | 대표 서비스 |
|------|----------|-------------|-----------|
| 🟠 주황 | `#ED7100` | Compute / Containers | EC2, Lambda, ECS, Fargate |
| 🟢 초록 | `#7AA116` | Storage / Cloud Financial | S3, EBS, EFS, Glacier |
| 🟣 보라 | `#8C4FFF` | Analytics / Networking | VPC, CloudFront, API Gateway, Athena |
| 🔴 빨강 | `#DD344C` | Security / Business | IAM, Cognito, GuardDuty, WAF |
| 🩷 분홍 | `#E7157B` | App Integration / Management | CloudWatch, EventBridge, SNS, SQS |
| 🔵 파랑 | `#3334B9` | Database | RDS, DynamoDB, Aurora, ElastiCache |
| 🩵 청록 | `#01A88D` | AI / Migration | SageMaker, Bedrock, DMS |

### 2.3 빌딩 매핑 로직 비교 (Git City vs Cloud Island)

| Git City | Cloud Island | 매핑 기준 | 시각화 |
|----------|-------------|----------|--------|
| 커밋 수 → 빌딩 높이 | API 호출 수 → 구름 두께 | 활동량 | 많을수록 두꺼운 구름층 |
| 리포 수 → 빌딩 너비 | 리소스 수 → 구름 면적 | 규모 | 많을수록 넓게 확장 |
| 스타 수 → 창문 밝기 | 정상 이벤트 비율 → 발광 강도 | 건강도 | 건강할수록 밝은 글로우 |
| 최근 활동 → 글로우 | 에러/경고 → 빨간 파티클 | 위험도 | 이상 시 붉은 파티클 효과 |
| 개발자별 빌딩 | 서비스 카테고리별 구름 구역 | 구역 분류 | 색상별 구름 대지 |
| 언어별 색상 | AWS 공식 카테고리 색상 | 색상 코드 | 위 색상표 참고 |

### 2.4 시각화 예시

```
            [구름 섬 조감도]

          🟢🟢🟢🟢              ← S3 (초록): 활동 많음 → 넓고 두꺼움
        🟢🟢🟢🟢🟢🟢
      🟠🟠🟠🟢🟢🟢🟢🟢🟣
    🟠🟠🟠🟠🟠🟢🟢🟢🟣🟣🟣      ← EC2 (주황): 활동 보통
    🟠🟠🟠🟠  🔵🔵  🟣🟣🟣
      🟠🟠  🔵🔵🔵  🟣🟣        ← RDS (파랑): 활동 적음 → 좁고 얇음
            🔵🔵
             🔴                ← IAM (빨강): 최소 활동
```

---

## 3. 벤치마크 분석 (Git City)

### 3.1 Git City 기술 스택 비교

| 구분 | Git City (원본) | Cloud Island (벤치마킹) |
|------|----------------|------------------------|
| Framework | Next.js 16 (App Router) | Next.js (App Router) |
| 3D Engine | Three.js + R3F + Drei | Three.js + R3F + Drei |
| DB & Auth | Supabase (GitHub OAuth) | Supabase / DynamoDB |
| 데이터 소스 | GitHub API | AWS CloudTrail API |
| 스타일링 | Tailwind CSS v4 | Tailwind CSS v4 |
| 호스팅 | Vercel | Vercel / S3 + CloudFront |
| 렌더링 방식 | Instanced Mesh (빌딩) | Instanced Mesh (복셀 구름) |

---

## 4. 시스템 아키텍처

### 4.1 전체 아키텍처 흐름

```
[AWS 계정 활동]
       ↓
  CloudTrail (무료, 90일 관리 이벤트)
       ↓
  Lambda (로그 파싱 + 서비스별/사용자별 집계)
       ↓
  DynamoDB (집계 데이터 저장)
       ↓
  API Gateway → Next.js API Route
       ↓
  Three.js + R3F (3D 구름 섬 렌더링)
```

### 4.2 단계별 구성

| 단계 | 구성 요소 | AWS 서비스 | 설명 |
|------|----------|-----------|------|
| 1단계 | 데이터 수집 | CloudTrail | AWS 계정 API 활동 자동 기록 (90일 무료) |
| 2단계 | 데이터 가공 | Lambda | 로그 파싱 → 서비스 카테고리별 집계 → 구름 파라미터(면적, 두께) 생성 |
| 3단계 | 데이터 저장 | DynamoDB | 집계 데이터 저장 |
| 4단계 | API 제공 | API Gateway | REST API 엔드포인트 제공, 프론트엔드 연동 |
| 5단계 | 3D 렌더링 | Next.js + Three.js | 복셀 기반 구름 섬 렌더링, LOD 시스템 적용 |

### 4.3 AWS 서비스 구성

**필수 서비스**

| 서비스 | 역할 | 비용 |
|--------|------|------|
| CloudTrail | 계정 내 모든 API 활동 기록 | 무료 (90일 관리 이벤트) |
| Lambda | 로그 파싱 및 카테고리별 집계 | 무료 티어 범위 내 |
| API Gateway | REST API 엔드포인트 | 무료 티어 범위 내 |
| DynamoDB | 집계 데이터 저장 | 무료 티어 25GB |

**선택 서비스**

| 서비스 | 역할 | 비고 |
|--------|------|------|
| S3 + CloudFront | 프론트엔드 정적 호스팅 | Vercel 대안 |
| Cognito | AWS 계정 기반 사용자 인증 | Supabase Auth 대안 |
| EventBridge | CloudTrail 이벤트 실시간 트리거 | 실시간 감지 시 |

---

## 5. 주요 기능 정의

### 5.1 3D 구름 섬 시각화

- AWS 서비스 카테고리별 공식 색상의 픽셀(복셀) 구름 지형 생성
- 활동량에 따라 구름 땅이 넓어지고(면적 확장) 두터워짐(층 추가)
- Free Flight Mode — 섬 위를 자유롭게 비행하며 구름 지형 탐색
- LOD (Level of Detail) 시스템 — 먼 구름은 저폴리, 가까이 가면 상세 렌더링
- Instanced Mesh 기반 복셀 구름 성능 최적화
- 에러/경고 이벤트 발생 시 해당 구역에 빨간 파티클 효과

### 5.2 구름 지형 상세 정보

- 구름 구역 클릭 시 해당 서비스 카테고리의 상세 활동 패널 표시
- 카테고리 내 개별 서비스별 API 호출 목록, 호출 빈도 그래프, 에러율 표시
- IAM 사용자별 호출 비중 표시

### 5.3 대시보드 및 사용자 기능

- IAM 사용자별 활동 프로필 페이지
- 서비스 카테고리 간 비교 모드 (Compare Mode)
- 시간대별 구름 성장 타임라인 애니메이션
- 공유 카드 다운로드 (섬 상태 스냅샷)

---

## 6. 기술 스택 상세

### 6.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16+ (App Router, Turbopack) | 프레임워크, SSR/SSG, API Routes |
| Three.js | r167+ | 3D 렌더링 엔진 |
| React Three Fiber | @react-three/fiber | React 기반 Three.js 래퍼 |
| Drei | @react-three/drei | R3F 헬퍼 컴포넌트 (OrbitControls 등) |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | v4 | UI 스타일링 |

### 6.2 백엔드 / 인프라

| 기술 | 구분 | 용도 |
|------|------|------|
| AWS CloudTrail | AWS 관리형 서비스 | 데이터 소스 (API 활동 로그) |
| AWS Lambda | AWS 서버리스 컴퓨팅 | 로그 파싱 + 카테고리별 집계 |
| DynamoDB | AWS NoSQL DB | 집계 데이터 저장 |
| API Gateway | AWS API 관리 | REST API 엔드포인트 제공 |
| Supabase | 오픈소스 BaaS | Auth (GitHub OAuth) + PostgreSQL (대안) |

---

## 7. 개발 계획

### 7.1 개발 단계 (4주 기준)

| 주차 | 단계 | 작업 내용 | 산출물 |
|------|------|----------|--------|
| 1주차 | 환경 구축 + 데이터 | AWS 계정 세팅, CloudTrail 설정, Lambda 로그 파싱 함수 개발, DynamoDB 테이블 설계, 서비스→카테고리 매핑 테이블 작성 | CloudTrail → DynamoDB 파이프라인 완성 |
| 2주차 | 3D 프론트엔드 | Next.js 프로젝트 세팅, Three.js 복셀 구름 렌더링 엔진 구축, 카테고리별 색상 매핑, API 연동 | 3D 구름 섬 렌더링 프로토타입 |
| 3주차 | 기능 개발 | 구름 상세 패널, 프로필 페이지, 비교 모드, 타임라인 애니메이션, 에러 파티클 효과 | 핵심 기능 완성 |
| 4주차 | UI 완성 + 테스트 | 대시보드 UI 마무리, 성능 최적화, 버그 수정, 배포 | 최종 배포 및 발표 준비 |

### 7.2 우선순위 (MoSCoW)

| 우선순위 | 기능 |
|----------|------|
| **Must Have** | CloudTrail 로그 수집/파싱, 복셀 구름 섬 렌더링, 카테고리별 공식 색상 매핑, 활동량 기반 면적/두께 확장 |
| **Should Have** | 에러 이벤트 파티클 효과, 구름 클릭 상세 패널, 사용자 프로필 |
| **Could Have** | 비교 모드, 시간대별 성장 애니메이션, 공유 카드 |
| **Won't Have** | 결제 시스템, 커스터마이징 샵, 멀티 계정 지원 |

---

## 8. 차별화 포인트

Git City와 비교했을 때, AWS Cloud Island만의 차별화 포인트는 다음과 같습니다.

1. **구름 지형 확장 시각화:** Git City가 빌딩 높이로 표현하는 것과 달리, 서비스 활동에 따라 구름 땅이 유기적으로 넓어지고 두터워지는 독창적 시각화 방식입니다.
2. **AWS 공식 색상 체계:** AWS 공식 아키텍처 아이콘의 카테고리 색상을 그대로 사용하여, AWS에 익숙한 사용자가 색상만으로 서비스 카테고리를 즉시 식별할 수 있습니다.
3. **인프라 모니터링 특화:** Git City가 개인 개발 활동 시각화라면, Cloud Island은 클라우드 인프라 운영 상태를 시각화하여 실무적 가치를 가집니다.
4. **섬(아일랜드) 메타포:** '하늘섬(Celesta)' 컨셉으로 클라우드 인프라의 특성을 직관적으로 표현하며, 구름이 자라는 모습이 인프라의 성장을 자연스럽게 나타냅니다.
5. **AWS 네이티브:** CloudTrail, Lambda, DynamoDB, API Gateway 등 AWS 서비스를 전면적으로 활용하여 AWS 생태계 내에서 완결됩니다.

---

## 9. 리스크 및 대응 방안

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| 복셀 렌더링 성능 | 많은 복셀 시 브라우저 버벅 | Instanced Mesh + LOD + 청크 기반 렌더링 |
| CloudTrail 데이터 부족 | 테스트 계정에 이벤트가 적을 수 있음 | 모의 데이터 생성 스크립트 준비 |
| 개발 기간 부족 | 4주 내 전체 기능 구현 어려움 | MoSCoW 우선순위 기반 스코프 관리 |
| Three.js 학습 곡선 | R3F + 복셀 렌더링 숙련에 시간 소요 | Git City 소스코드 참고 + 공식 문서 |
| 색상 접근성 | 색각 이상 사용자 구분 어려움 | 구역별 텍스트 라벨 + 패턴 오버레이 제공 |

---

## 10. 기대 효과

1. **직관적 인프라 모니터링:** 색상과 구름 크기만으로 어떤 서비스가 활발한지 한눈에 파악 가능
2. **보안 가시성 확보:** 에러/경고 이벤트가 빨간 파티클로 즉시 드러나 문제 구역을 빠르게 식별
3. **AWS 서비스 활용 역량:** CloudTrail, Lambda, DynamoDB, API Gateway 등 4개 이상 AWS 서비스를 실제 프로젝트에 통합 적용
4. **포트폴리오 가치:** 복셀 기반 구름 시각화라는 독창적 접근으로 포트폴리오/발표에서 높은 임팩트