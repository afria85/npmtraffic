import { POPULAR_PACKAGES } from "@/lib/constants";

export default function Home() {
  return (
      <main className="min-h-screen p-6">
            <div className="mx-auto max-w-xl space-y-4">
                    <h1 className="text-3xl font-bold">npmtraffic</h1>
                            <p className="text-base text-gray-600">
                                      npm downloads, GitHub-style traffic view.
                                              </p>

                                                      <div className="pt-4">
                                                                <h2 className="text-sm font-semibold text-gray-500">Popular</h2>
                                                                          <div className="mt-2 flex flex-wrap gap-2">
                                                                                      {POPULAR_PACKAGES.map((pkg) => (
                                                                                                    <span
                                                                                                                    key={pkg}
                                                                                                                                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                                                                                                                                                  >
                                                                                                                                                                  {pkg}
                                                                                                                                                                                </span>
                                                                                                                                                                                            ))}
                                                                                                                                                                                                      </div>
                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                        </main>
                                                                                                                                                                                                                          );
                                                                                                                                                                                                                          }