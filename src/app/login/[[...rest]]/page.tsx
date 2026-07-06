import { SignIn } from "@/lib/clerk-stub";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                    }
                }}
                signUpUrl="/signup"
            />
        </div>
    );
}
