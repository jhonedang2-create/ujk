-- 직원·관리자가 이메일 대신 별도 로그인 아이디를 사용할 수 있도록 합니다.
ALTER TABLE "User" ADD COLUMN "loginId" TEXT;

CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
