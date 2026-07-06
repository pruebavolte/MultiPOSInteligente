import { SignUp } from "@/lib/clerk-stub";

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                    }
                }}
                signInUrl="/login"
            />
        </div>
    );
}
