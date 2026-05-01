import { NextResponse } from 'next/server'
import { runCaptionPipeline } from '@/lib/captionPipeline'

export async function POST(request: Request) {
  const signal = request.signal

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('image')
  const userId = formData.get('userId')
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!(file instanceof File) || !userId || typeof userId !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing image or userId' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing authorization' }, { status: 401 })
  }

  const result = await runCaptionPipeline({
    file,
    token,
    userId,
    signal,
  })

  if (!result.success && result.aborted) {
    return NextResponse.json(result, { status: 499 })
  }

  if (!result.success) {
    return NextResponse.json(result, { status: 500 })
  }

  return NextResponse.json(result)
}
