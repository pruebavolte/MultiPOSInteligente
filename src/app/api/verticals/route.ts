import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";
import type { Vertical } from "@/types/brand";

// GET /api/verticals - List all available verticals (business types)
export async function GET(req: NextRequest) {
  try {
    // Don't require auth for public verticals list (for onboarding)
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";

    let query = supabase
      .from("verticals")
      .select("*")
      .order("display_name");

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data as Vertical[],
      success: true,
    });
  } catch (error) {
    console.error("Error fetching verticals:", error);
    return NextResponse.json(
      { error: "Failed to fetch verticals", success: false },
      { status: 500 }
    );
  }
}

// POST /api/verticals - Create new vertical (super admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Check if user is super admin

    const body = await req.json();
    const {
      name,
      display_name,
      description,
      icon,
      default_modules,
      default_settings,
    } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name", success: false },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("verticals")
      .insert({
        name,
        display_name,
        description,
        icon,
        default_modules: default_modules || {},
        default_settings: default_settings || {},
        active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Vertical name already exists", success: false },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { data: data as Vertical, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vertical:", error);
    return NextResponse.json(
      { error: "Failed to create vertical", success: false },
      { status: 500 }
    );
  }
}

// PATCH /api/verticals - Update vertical (super admin only)
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Vertical ID is required", success: false },
        { status: 400 }
      );
    }

    delete updates.created_at;

    const { data, error } = await supabase
      .from("verticals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: data as Vertical, success: true });
  } catch (error) {
    console.error("Error updating vertical:", error);
    return NextResponse.json(
      { error: "Failed to update vertical", success: false },
      { status: 500 }
    );
  }
}
