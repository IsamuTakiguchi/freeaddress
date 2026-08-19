import bcrypt from "bcryptjs";
import { db } from "../src/db";
import { resources, users } from "../src/db/schema";

function main() {
  const existingUsers = db.select({ id: users.id }).from(users).all();
  if (existingUsers.length > 0) {
    console.log("既にユーザーが存在するため、シードをスキップしました。");
    return;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";

  db.insert(users)
    .values([
      {
        email: adminEmail.toLowerCase(),
        name: "管理者",
        passwordHash: bcrypt.hashSync(adminPassword, 10),
        isAdmin: 1,
      },
      {
        email: "user@example.com",
        name: "テスト太郎",
        passwordHash: bcrypt.hashSync("user1234", 10),
        isAdmin: 0,
      },
    ])
    .run();

  db.insert(resources)
    .values([
      { name: "テレワークブース１", type: "booth", capacity: 1, sortOrder: 1 },
      { name: "テレワークブース２", type: "booth", capacity: 1, sortOrder: 2 },
      { name: "テレワークブース３", type: "booth", capacity: 1, sortOrder: 3 },
      { name: "テレワークブース４", type: "booth", capacity: 1, sortOrder: 4 },
      { name: "会議室Ａ", type: "room", capacity: 6, sortOrder: 10 },
      { name: "会議室Ｂ", type: "room", capacity: 10, sortOrder: 11 },
    ])
    .run();

  console.log("シード完了:");
  console.log(`  管理者: ${adminEmail} / ${adminPassword}`);
  console.log("  一般ユーザー: user@example.com / user1234");
  console.log("  設備: テレワークブース１〜４、会議室Ａ・Ｂ");
}

main();
