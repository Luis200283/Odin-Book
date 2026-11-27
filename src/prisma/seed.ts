import "dotenv/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/db/client";
import { reconcilePostCounts } from "@/lib/counters";

const PASSWORD = "password123";

const userSeeds = [
  {
    name: "Ana Torres",
    email: "ana@odin.local",
    username: "ana",
    bio: "Redis, feeds and too much coffee.",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ana",
  },
  {
    name: "Luis HC",
    email: "luis@odin.local",
    username: "luis",
    bio: "Next.js, Prisma and Socket.IO.",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Luis",
  },
  {
    name: "Maya Chen",
    email: "maya@odin.local",
    username: "maya",
    bio: "Frontend and design systems.",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maya",
  },
  {
    name: "Diego Ruiz",
    email: "diego@odin.local",
    username: "diego",
    bio: "Backend and databases.",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Diego",
  },
  {
    name: "Sofia Park",
    email: "sofia@odin.local",
    username: "sofia",
    bio: "Learning in public.",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia",
  },
  {
    name: "Noah Kim",
    email: "noah@odin.local",
    username: "noah",
    bio: "Small side projects, big lessons.",
    image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Noah",
  },
];

const postSeeds = [
  {
    id: "seed-post-01",
    author: "ana",
    content:
      "Redis is the speed layer, not the source of truth. Neon keeps the data; Redis makes the feed feel instant.",
    imageUrl: null,
    hoursAgo: 2,
  },
  {
    id: "seed-post-02",
    author: "luis",
    content:
      "Today I connected Socket.IO to Redis pub/sub. Two browser tabs finally see the same like in real time.",
    imageUrl: null,
    hoursAgo: 4,
  },
  {
    id: "seed-post-03",
    author: "maya",
    content:
      "A feed is just a list of IDs until you hydrate it. Cache the IDs, batch the posts.",
    imageUrl: "https://picsum.photos/seed/odin-feed-3/800/600",
    hoursAgo: 6,
  },
  {
    id: "seed-post-04",
    author: "diego",
    content:
      "Added a composite index on (authorId, createdAt desc, id desc). The feed query dropped from 120ms to 8ms.",
    imageUrl: null,
    hoursAgo: 8,
  },
  {
    id: "seed-post-05",
    author: "sofia",
    content:
      "Learning in public: cache-aside is easier to debug than fan-out on write for an MVP.",
    imageUrl: null,
    hoursAgo: 10,
  },
  {
    id: "seed-post-06",
    author: "noah",
    content:
      "The best part of a side project is that you can delete the feature you don't understand.",
    imageUrl: null,
    hoursAgo: 12,
  },
  {
    id: "seed-post-07",
    author: "ana",
    content:
      "TTL 60s + invalidation on write is a good enough feed for a small social app.",
    imageUrl: null,
    hoursAgo: 18,
  },
  {
    id: "seed-post-08",
    author: "luis",
    content:
      "Zod on the client and the server is not duplication; it's the same contract in two places.",
    imageUrl: null,
    hoursAgo: 22,
  },
  {
    id: "seed-post-09",
    author: "maya",
    content: "Optimistic likes are 80% of the perceived performance.",
    imageUrl: "https://picsum.photos/seed/odin-feed-9/800/600",
    hoursAgo: 26,
  },
  {
    id: "seed-post-10",
    author: "diego",
    content:
      "Denormalized counters need a reconciliation script. That's the tax.",
    imageUrl: null,
    hoursAgo: 30,
  },
  {
    id: "seed-post-11",
    author: "sofia",
    content:
      "Cursor pagination is not harder than offset; it's just less familiar.",
    imageUrl: null,
    hoursAgo: 34,
  },
  {
    id: "seed-post-12",
    author: "noah",
    content:
      "If Redis goes down, the app should still work. Slower, but alive.",
    imageUrl: null,
    hoursAgo: 38,
  },
  {
    id: "seed-post-13",
    author: "ana",
    content:
      "New post flow: write to Neon, delete follower feed keys, publish post:new. Simple.",
    imageUrl: null,
    hoursAgo: 42,
  },
  {
    id: "seed-post-14",
    author: "luis",
    content:
      "The socket server doesn't need Prisma. It only needs a JWT and Redis.",
    imageUrl: null,
    hoursAgo: 46,
  },
  {
    id: "seed-post-15",
    author: "maya",
    content:
      "Designing the empty feed is designing the first follow recommendation.",
    imageUrl: "https://picsum.photos/seed/odin-feed-15/800/600",
    hoursAgo: 50,
  },
  {
    id: "seed-post-16",
    author: "diego",
    content:
      "A unique constraint on (userId, postId) makes likes idempotent for free.",
    imageUrl: null,
    hoursAgo: 54,
  },
  {
    id: "seed-post-17",
    author: "sofia",
    content:
      "I finally understand why the feed cache stores IDs and stats separately.",
    imageUrl: null,
    hoursAgo: 58,
  },
  {
    id: "seed-post-18",
    author: "noah",
    content:
      "Ship the text-only version. Add images when the feed is already fast.",
    imageUrl: null,
    hoursAgo: 62,
  },
];

const followSeeds = [
  ["luis", "ana"],
  ["luis", "maya"],
  ["luis", "diego"],
  ["maya", "ana"],
  ["maya", "luis"],
  ["maya", "sofia"],
  ["diego", "ana"],
  ["diego", "luis"],
  ["diego", "noah"],
  ["sofia", "ana"],
  ["sofia", "maya"],
  ["sofia", "luis"],
  ["noah", "ana"],
  ["noah", "diego"],
  ["noah", "sofia"],
  ["ana", "luis"],
  ["ana", "maya"],
  ["ana", "sofia"],
];

const likeSeeds = [
  ["luis", "seed-post-01"],
  ["maya", "seed-post-01"],
  ["diego", "seed-post-01"],
  ["sofia", "seed-post-01"],
  ["ana", "seed-post-02"],
  ["maya", "seed-post-02"],
  ["noah", "seed-post-02"],
  ["ana", "seed-post-03"],
  ["luis", "seed-post-03"],
  ["diego", "seed-post-03"],
  ["ana", "seed-post-04"],
  ["luis", "seed-post-04"],
  ["sofia", "seed-post-04"],
  ["maya", "seed-post-05"],
  ["noah", "seed-post-05"],
  ["ana", "seed-post-06"],
  ["luis", "seed-post-06"],
  ["diego", "seed-post-07"],
  ["maya", "seed-post-07"],
  ["sofia", "seed-post-08"],
  ["noah", "seed-post-08"],
  ["ana", "seed-post-09"],
  ["luis", "seed-post-09"],
  ["diego", "seed-post-09"],
  ["maya", "seed-post-10"],
  ["sofia", "seed-post-11"],
  ["noah", "seed-post-12"],
  ["luis", "seed-post-13"],
  ["maya", "seed-post-14"],
  ["diego", "seed-post-15"],
  ["ana", "seed-post-16"],
  ["sofia", "seed-post-17"],
  ["noah", "seed-post-18"],
];

const commentSeeds = [
  {
    id: "seed-comment-01",
    postId: "seed-post-01",
    author: "luis",
    content: "The fallback to Neon when Redis is down is the part I like most.",
    hoursAgo: 1,
  },
  {
    id: "seed-comment-02",
    postId: "seed-post-02",
    author: "maya",
    content: "Two tabs is the real hello world of realtime.",
    hoursAgo: 3,
  },
  {
    id: "seed-comment-03",
    postId: "seed-post-03",
    author: "diego",
    content: "Batch hydration with MGET is next on my list.",
    hoursAgo: 5,
  },
  {
    id: "seed-comment-04",
    postId: "seed-post-04",
    author: "ana",
    content: "That index is doing a lot of quiet work.",
    hoursAgo: 7,
  },
  {
    id: "seed-comment-05",
    postId: "seed-post-05",
    author: "noah",
    content: "Cache-aside is also much easier to explain in a postmortem.",
    hoursAgo: 9,
  },
  {
    id: "seed-comment-06",
    postId: "seed-post-07",
    author: "sofia",
    content: "60 seconds is the perfect excuse to avoid perfect invalidation.",
    hoursAgo: 17,
  },
  {
    id: "seed-comment-07",
    postId: "seed-post-09",
    author: "ana",
    content: "Optimistic UI is a feature and a debugging exercise.",
    hoursAgo: 25,
  },
  {
    id: "seed-comment-08",
    postId: "seed-post-12",
    author: "luis",
    content: "Degrade, don't die. Good rule for every cache.",
    hoursAgo: 37,
  },
  {
    id: "seed-comment-09",
    postId: "seed-post-14",
    author: "diego",
    content: "Decoupling the socket server from Prisma keeps it tiny.",
    hoursAgo: 45,
  },
  {
    id: "seed-comment-10",
    postId: "seed-post-18",
    author: "maya",
    content: "Text first, images after the feed is fast. Exactly.",
    hoursAgo: 61,
  },
];

async function ensureUser(input: (typeof userSeeds)[number]) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: PASSWORD,
      },
    });
  }

  return prisma.user.update({
    where: { email: input.email },
    data: {
      name: input.name,
      username: input.username,
      bio: input.bio,
      image: input.image,
      emailVerified: true,
    },
    select: { id: true, username: true },
  });
}

async function main() {
  console.log("Seeding users...");
  const users = new Map<string, { id: string; username: string }>();

  for (const user of userSeeds) {
    const saved = await ensureUser(user);
    if (!saved.username) {
      throw new Error(`User ${saved.id} has no username`);
    }
    users.set(saved.username, { id: saved.id, username: saved.username });
    console.log(`  ✓ @${saved.username}`);
  }

  console.log("Seeding posts...");
  for (const post of postSeeds) {
    const author = users.get(post.author);
    if (!author) {
      throw new Error(`Missing author @${post.author}`);
    }

    await prisma.post.upsert({
      where: { id: post.id },
      update: {
        authorId: author.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: new Date(Date.now() - post.hoursAgo * 60 * 60 * 1000),
      },
      create: {
        id: post.id,
        authorId: author.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: new Date(Date.now() - post.hoursAgo * 60 * 60 * 1000),
      },
    });
  }

  console.log("Seeding follows...");
  for (const [followerUsername, followingUsername] of followSeeds) {
    const follower = users.get(followerUsername);
    const following = users.get(followingUsername);
    if (!follower || !following) {
      throw new Error(`Missing follow pair ${followerUsername} -> ${followingUsername}`);
    }

    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: follower.id,
          followingId: following.id,
        },
      },
      update: {},
      create: {
        followerId: follower.id,
        followingId: following.id,
      },
    });
  }

  console.log("Seeding likes...");
  for (const [username, postId] of likeSeeds) {
    const user = users.get(username);
    if (!user) {
      throw new Error(`Missing user @${username}`);
    }

    await prisma.like.upsert({
      where: {
        userId_postId: {
          userId: user.id,
          postId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        postId,
      },
    });
  }

  console.log("Seeding comments...");
  for (const comment of commentSeeds) {
    const author = users.get(comment.author);
    if (!author) {
      throw new Error(`Missing comment author @${comment.author}`);
    }

    await prisma.comment.upsert({
      where: { id: comment.id },
      update: {
        postId: comment.postId,
        authorId: author.id,
        content: comment.content,
        createdAt: new Date(Date.now() - comment.hoursAgo * 60 * 60 * 1000),
      },
      create: {
        id: comment.id,
        postId: comment.postId,
        authorId: author.id,
        content: comment.content,
        createdAt: new Date(Date.now() - comment.hoursAgo * 60 * 60 * 1000),
      },
    });
  }

  const reconciled = await reconcilePostCounts();
  console.log(`Reconciled ${reconciled} posts.`);
  console.log("");
  console.log("Seed complete. Login with any user:");
  console.log("  email:    ana@odin.local");
  console.log(`  password: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
