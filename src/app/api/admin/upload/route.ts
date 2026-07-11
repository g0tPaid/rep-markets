import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { saveUploadedImage } from '@/lib/uploads';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    const url = await saveUploadedImage(file);
    if (!url) {
      return NextResponse.json({ error: 'Upload failed.' }, { status: 400 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('upload failed', error);
    const message = error instanceof Error ? error.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
