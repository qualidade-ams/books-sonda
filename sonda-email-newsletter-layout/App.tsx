import React from 'react';
import FeedbackCard from './components/FeedbackCard';
import QuoteDivider from './components/QuoteDivider';
import { ROW_ONE, ROW_TWO, ROW_THREE } from './constants';

export default function App() {
  return (
    <div className="min-h-screen flex justify-center py-0 md:py-10 bg-gray-100">
      {/* Email Container - using standard email width max-width approx 1200px for this desktop view */}
      <div className="w-full max-w-[1200px] bg-white shadow-xl mx-auto flex flex-col">

        {/* HEADER IMAGE */}
        <header className="w-full">
          <img
            src="/header.png"
            alt="Sonda Header - Recognition"
            className="w-full h-auto block object-cover"
          />
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="w-full px-8 py-10 md:px-12 md:py-14 bg-white">

          {/* ROW 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {ROW_ONE.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>

          {/* DIVIDER 1: Line with Blue Quote on Right */}
          <QuoteDivider position="right" color="blue" />

          {/* ROW 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {ROW_TWO.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>

          {/* DIVIDER 2: Line with Pink Quote on Left */}
          <QuoteDivider position="left" color="pink" />

          {/* ROW 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {ROW_THREE.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>

        </main>

        {/* FOOTER IMAGE */}
        <footer className="w-full mt-auto">
          <img
            src="/footer.png"
            alt="Sonda Footer - Contact Instructions"
            className="w-full h-auto block object-cover"
          />
        </footer>
      </div>
    </div>
  );
}