import React from 'react'

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-hf-bg transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-hf-text sm:text-5xl md:text-6xl">
            About Us
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-hf-muted">
            Meet the team behind ArtX.
          </p>
        </div>

        <div className="mt-16">
          <div className="bg-gray-50 dark:bg-hf-card rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-12 sm:px-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-hf-text mb-8">
                The Developers
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="flex flex-col items-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-4xl mb-6 shadow-lg">
                    DG
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-hf-text">Danny Guan</h3>
                  <p className="mt-2 text-lg text-purple-600 dark:text-hf-yellow font-medium">Computer Science Student</p>
                  <p className="mt-1 text-gray-500 dark:text-hf-muted">Toronto Metropolitan University</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-r from-blue-400 to-teal-500 flex items-center justify-center text-4xl mb-6 shadow-lg">
                    AA
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-hf-text">Anish Ahuja</h3>
                  <p className="mt-2 text-lg text-purple-600 dark:text-hf-yellow font-medium">Computer Science Student</p>
                  <p className="mt-1 text-gray-500 dark:text-hf-muted">Toronto Metropolitan University</p>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-700">
                <p className="text-lg text-gray-600 dark:text-hf-muted">
                  We are passionate about connecting artists with art lovers through technology. 
                  ArtX is our vision for a modern, seamless, and beautiful art auctioning platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
