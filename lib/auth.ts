import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABSE_SERVICE_ROLE_KEY!;

export async function getClaims(request: NextRequest): Promise<{ userId: string } | null> {
	const token = request.headers.get('authorization');

	if (!token) {
		return null;
	}

	const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return null;
	}

	return { userId: data.user.id };
}

export function unauthorized() {
	return Response.json(
		{
			success: false,
			error: 'unauthorized'
		},
		{
			status: 401
		}
	);
}
