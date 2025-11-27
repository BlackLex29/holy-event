export default function Unauthorized() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600">Unauthorized Access</h1>
                <p className="mt-2">You don't have permission to access this page.</p>
                <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
                    Return to Login
                </a>
            </div>
        </div>
    );
}