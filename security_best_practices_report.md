# 安全审计报告

**审计日期**: 2026-10-06  
**审计范围**: BookBunny SaaS 全栈 Next.js 应用  
**严重度定义**: Critical > High > Medium > Low > Info

---

## 执行摘要

本次审计针对代码仓库的认证授权、注入向量、外部交互及敏感数据处理进行了系统性检查。**共确认 3 个中等严重度漏洞**，均为认证后的不安全的直接对象引用（IDOR）。多处产品所有权校验代码被注释掉，导致任意已认证用户可读取或修改其他用户的产品关联数据。

SQL 注入、命令注入、Webhook 签名绕过等高风险攻击面**未确认存在可利用漏洞**。

---

## 严重度分布

| 严重度 | 数量 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 0 |

---

## 中危漏洞（Medium）

### IDOR-1: 产品外链（Backlinks）信息泄露

**位置**: [src/actions/get-product-backlinks.ts](file:///workspace/src/actions/get-product-backlinks.ts#L74-L86)

**攻击者画像**: 任意已认证用户（无需管理员权限）

**可控输入向量**: `productId`（字符串，通过 `getProductBacklinksSchema` 传入）

**代码路径**:
1. 攻击者调用 `getProductBacklinksAction`，传入任意 `productId`
2. 第 74–86 行的产品所有权校验被注释掉：
   ```ts
   // const productRecord = await db
   //   .select()
   //   .from(product)
   //   .where(and(eq(product.id, productId), eq(product.userId, userId)))
   //   .limit(1);
   ```
3. 查询直接以 `productId` 作为 `productDirectory.productId` 的 join 条件，返回该产品的外链状态与备注

**影响**: 攻击者可枚举 `productId`，获取其他用户产品的目录提交状态（`backlinkStatus`）及内部备注（`backlinkNotes`），造成商业情报泄露。

**修复建议**: 取消注释并恢复所有权校验逻辑，确保 `productRecord` 存在且 `userId` 匹配后再执行查询。

---

### IDOR-2: 产品促销（Deals）信息泄露

**位置**: [src/actions/get-product-deals.ts](file:///workspace/src/actions/get-product-deals.ts#L29-L43)

**攻击者画像**: 任意已认证用户

**可控输入向量**: `productId`（字符串，通过 `getProductDealsSchema` 传入）

**代码路径**:
1. 攻击者调用 `getProductDealsAction`，传入任意 `productId`
2. 第 29–43 行的产品所有权校验被注释掉
3. 查询以 `productDeal.productId = parsedInput.productId` 作为 left join 条件，返回该产品的所有促销活动数据

**影响**: 泄露其他用户产品的定价策略，包括 deal 价格（`price`）、原价（`originalPrice`）、折扣文案（`discount`）及优惠券码（`couponCode`）。

**修复建议**: 恢复产品所有权校验，仅当 `product.userId === currentUser.id` 时才返回数据。

---

### IDOR-3: 产品目录状态未授权修改

**位置**: [src/actions/update-product-directory-status.ts](file:///workspace/src/actions/update-product-directory-status.ts#L31-L43)

**攻击者画像**: 任意已认证用户

**可控输入向量**: `productId`、`directoryId`、`status`、`notes`

**代码路径**:
1. 攻击者调用 `updateProductDirectoryStatusAction`，传入任意 `productId` 和 `directoryId`
2. 第 31–43 行的产品所有权校验被注释掉
3. 代码直接对 `productDirectory` 表执行 `update`、`insert` 或 `delete` 操作

**影响**: 攻击者可任意修改其他用户产品的目录提交状态（如将 `submitted` 改为 `rejected` 或 `approved`），甚至伪造/删除 `productDirectory` 记录，破坏数据完整性。

**修复建议**: 恢复所有权校验；在修改 `productDirectory` 前确认 `product.userId === currentUser.id`。

---

## 已检查但未确认漏洞的攻击面

| 攻击面 | 检查结果 |
|--------|----------|
| SQL 注入 | 使用 Drizzle ORM 参数化查询，无原始字符串拼接；`sql` 模板标签亦使用参数化插值，未发现注入点 |
| 命令注入 | `export-pdf` 与 `export-video` 使用 `execSync`，但用户输入仅写入 JSON 文件，命令参数为服务端生成的临时路径，无可利用的注入向量 |
| Stripe Webhook | 使用 `stripe.webhooks.constructEvent` 进行签名验证，安全 |
| Waffo Webhook | 使用 HMAC-SHA256 + `crypto.timingSafeEqual` 进行签名验证，安全 |
| 文件上传 | `/api/storage/upload` 校验文件类型（jpg/png/webp）与大小，安全 |
| SSRF（外部图片拉取） | `uploadImageFromUrl` 拉取用户提供的 URL，但仅用于产品 Logo/OG 图，且校验 `content-type` 为 `image/*`；未限制内网 IP，实际利用条件受限，未达中危确认标准 |
| 会话管理 | Better Auth 配置合理，使用 `userActionClient` / `adminActionClient` 进行服务端动作鉴权 |
| Cron 端点 | 使用 Basic Auth 校验，安全 |

---

## 附录：引用代码

**IDOR-1 被注释的校验（get-product-backlinks.ts）**
```ts
// Verify product belongs to current user
// const productRecord = await db
//   .select()
//   .from(product)
//   .where(and(eq(product.id, productId), eq(product.userId, userId)))
//   .limit(1);
// if (productRecord.length === 0) {
//   return { success: false, error: 'Product not found' };
// }
```

**IDOR-2 被注释的校验（get-product-deals.ts）**
```ts
// Verify product belongs to current user
// const productRecord = await db
//   .select()
//   .from(product)
//   .where(and(eq(product.id, parsedInput.productId), eq(product.userId, userId)))
//   .limit(1);
// if (productRecord.length === 0) {
//   return { success: false, error: 'Product not found or you do not have permission' };
// }
```

**IDOR-3 被注释的校验（update-product-directory-status.ts）**
```ts
// Verify product belongs to current user
// const productRecord = await db
//   .select()
//   .from(product)
//   .where(and(eq(product.id, productId), eq(product.userId, userId)))
//   .limit(1);
// if (productRecord.length === 0) {
//   return { success: false, error: 'Product not found or you do not have permission' };
// }
```
