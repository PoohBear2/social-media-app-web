import { getClaims, unauthorized } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export async function DELETE(request: NextRequest) {
	const claims = await getClaims(request);

	if (!claims) {
		return unauthorized();
	}

	const { userId } = claims;

	const { data: buckets } = await supabaseAdmin.storage.listBuckets();

	if (buckets) {
		for (const bucket of buckets) {
			const { data: files } = await supabaseAdmin.storage.from(bucket.name).list(userId);

			if (files && files.length > 0) {
				const filePaths = files.map((f) => `${userId}/${f.name}`);
				await supabaseAdmin.storage.from(bucket.name).remove(filePaths);
			}
		}
	}

    const {error} = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
        return Response.json({success: false, error: error.message}, {status: 500})
    }

    return Response.json({success: true})

}
