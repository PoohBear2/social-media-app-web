import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
	const authHeader = request.headers.get('authorization');
	if (REVENUECAT_WEBHOOK_SECRET && authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
		return Response.json({ success: false, error: 'Invalid webhook secret' }, { status: 401 });
	}

	const body = await request.json();
	const event = body.event;

	if (!event) {
		return Response.json({ success: false, error: 'No event in payload' }, { status: 400 });
	}

	const appUserId = event.app_user_id;
	const productId = event.product_id;
	const originalTranscriptionId = event.original_transaction_id;
	const expirationAtMs = event.expiration_at_ms;

	if (!appUserId || !productId) {
		return Response.json(
			{ success: false, error: 'missing app user id or product id' },
			{ status: 400 }
		);
	}

	const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null;

	switch (event.type) {
		case 'INITIAL_PURCHASE':
		case 'RENEWAL':
		case 'PRODUCT_CHANGE':
		case 'UNCANCELLATION': {
			const { error } = await supabaseAdmin.from('entitlements').upsert(
				{
					user_id: appUserId,
					product_id: productId,
					is_active: true,
					expires_at: expiresAt,
					purchased_at: new Date().toISOString(),
					revenucat_original_transaction_id: originalTranscriptionId,
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'user_id,product_id' }
			);

			if (error) {
				return Response.json({ success: false, error: error.message }, { status: 500 });
			}
			break;
		}
		case 'CANCELLATION':
		case 'EXPIRATION':
		case 'BILLING_ISSUE': {
			const { error } = await supabaseAdmin
				.from('entitlements')
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq('user_id', appUserId)
				.eq('product_id', productId);
			if (error) {
				return Response.json({ success: false, error: error.message }, { status: 500 });
			}
			break;
		}
		default:
			break;
	}

    return Response.json({success: true});
}
