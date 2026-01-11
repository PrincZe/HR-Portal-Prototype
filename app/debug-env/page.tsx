'use client';

export default function DebugEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const keyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="space-y-2 font-mono text-sm">
        <div>
          <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>
          <br />
          {supabaseUrl || '❌ NOT SET'}
        </div>
        <div>
          <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>
          <br />
          {hasKey ? `✅ SET (starts with: ${keyPrefix}...)` : '❌ NOT SET'}
        </div>
      </div>
      <div className="mt-8">
        <a href="/login" className="text-blue-600 underline">
          Back to Login
        </a>
      </div>
    </div>
  );
}
