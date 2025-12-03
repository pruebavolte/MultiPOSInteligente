import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/factory";
import type { VerticalCategory } from "../route";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";
    const includeVerticals = searchParams.get("includeVerticals") === "true";

    let query = supabase
      .from("vertical_categories")
      .select(includeVerticals ? `
        *,
        verticals(id, name, slug, display_name, display_name_en, icon, popularity_score, sort_order, active)
      ` : "*")
      .order("sort_order");

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({
          data: [],
          success: true,
          message: "Categories table not yet created. Run migrations first.",
        });
      }
      throw error;
    }

    return NextResponse.json({
      data: data as unknown as VerticalCategory[],
      success: true,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", success: false },
      { status: 500 }
    );
  }
}
