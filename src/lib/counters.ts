import { prisma } from "@/db/client";

export async function reconcilePostCounts() {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  if (posts.length === 0) {
    return 0;
  }

  await prisma.$transaction(
    posts.map((post) =>
      prisma.post.update({
        where: { id: post.id },
        data: {
          likeCount: post._count.likes,
          commentCount: post._count.comments,
        },
      }),
    ),
  );

  return posts.length;
}
