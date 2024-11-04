import { eq, sql, sum } from "drizzle-orm"

import { db } from "@/core/data/db/database"
import { users } from "@/core/data/db/schema"

export async function incrementDownloadCount(user: number) {
    await db.insert(users)
        .values({ id: user, downloadCount: 1 })
        .onConflictDoUpdate({ target: users.id, set: { downloadCount: sql`${users.downloadCount} + 1` } })
        .returning()
}

export async function getDownloadStats(user?: number) {
    const res = await db
        .select({ downloadCount: sum(users.downloadCount) })
        .from(users)
        .where(user !== undefined ? eq(users.id, user) : undefined)
    return res.reduce((p, c) => p + +(c.downloadCount || ""), 0)
}
