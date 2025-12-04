// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // Validate application_id
    if (!application_id || typeof application_id !== "string") {
      return new Response(
        JSON.stringify({ error: "application_id is required and must be a valid UUID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate task_type
    if (!task_type || !VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ error: `task_type must be one of: ${VALID_TYPES.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate due_at
    if (!due_at) {
      return new Response(
        JSON.stringify({ error: "due_at is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "due_at must be a valid timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a future timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch application to get tenant_id
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert task
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        application_id,
        tenant_id: application.tenant_id,
        type: task_type,
        due_at: dueDate.toISOString(),
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create task" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, task_id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
