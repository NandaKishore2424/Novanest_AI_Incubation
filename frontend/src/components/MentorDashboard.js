import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../UserContext';
import { format } from 'date-fns';

const MentorDashboard = () => {
  const { user, loading } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [matchedEntrepreneurs, setMatchedEntrepreneurs] = useState([]);
  const [mentorshipRequests, setMentorshipRequests] = useState([]);
  const [activeMentorships, setActiveMentorships] = useState([]);
  const [metrics, setMetrics] = useState({
    totalMentees: 0,
    activeRequests: 0,
    mentorshipSessions: 0,
    impactScore: 0
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Add new state for profile management
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    currentPosition: '',
    location: '',
    linkedin: ''
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [expertiseInput, setExpertiseInput] = useState('');
  const fileInputRef = useRef(null);

  // Add these state variables with your other state declarations:
  const [profileSettings, setProfileSettings] = useState({
    visibility: true,
    emailNotifications: true,
    availabilityStatus: 'open'
  });

  useEffect(() => {
    if (!loading && user) {
      const fetchData = async () => {
        try {
          // Fetch matched entrepreneurs
          const matchResponse = await axios.get(`http://localhost:5000/api/match/mentees`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          setMatchedEntrepreneurs(matchResponse.data);
          
          // Fetch mentorship requests
          const requestsResponse = await axios.get(`http://localhost:5000/api/mentorship/requests`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          setMentorshipRequests(requestsResponse.data || []);
          
          // Fetch active mentorships
          const mentorshipsResponse = await axios.get(`http://localhost:5000/api/mentorship/active`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          setActiveMentorships(mentorshipsResponse.data || []);
          
          // Set metrics
          setMetrics({
            totalMentees: mentorshipsResponse.data?.length || 0,
            activeRequests: requestsResponse.data?.length || 0,
            mentorshipSessions: mentorshipsResponse.data?.reduce((total, mentorship) => total + (mentorship.sessionCount || 0), 0),
            impactScore: calculateImpactScore(mentorshipsResponse.data || [])
          });
        } catch (error) {
          console.error('Error fetching mentor dashboard data:', error);
        }
      };
      
      fetchData();
    }
  }, [user, loading]);

  // Add this effect to initialize settings from user data:
  useEffect(() => {
    if (user && user.profileSettings) {
      setProfileSettings({
        visibility: user.profileSettings.visibility !== false,
        emailNotifications: user.profileSettings.emailNotifications !== false,
        availabilityStatus: user.profileSettings.availabilityStatus || 'open'
      });
    }
  }, [user]);

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        bio: user.profileDetails?.bio || '',
        currentPosition: user.profileDetails?.currentPosition || '',
        location: user.profileDetails?.location || '',
        linkedin: user.profileDetails?.socialLinks?.linkedin || ''
      });
    }
  }, [user]);

  const calculateImpactScore = (mentorships) => {
    // Simple impact score calculation
    // 10 points per mentee + 2 points per session + bonus for completed mentorships
    const baseScore = mentorships.length * 10;
    const sessionScore = mentorships.reduce((total, mentorship) => total + (mentorship.sessionCount || 0) * 2, 0);
    const completionBonus = mentorships.filter(m => m.status === 'completed').length * 15;
    
    return baseScore + sessionScore + completionBonus;
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle expertise addition
  const handleAddExpertise = (expertise) => {
    if (!user.mentorshipAreas) {
      user.mentorshipAreas = [];
    }
    
    if (expertise && !user.mentorshipAreas.includes(expertise)) {
      const updatedAreas = [...user.mentorshipAreas, expertise];
      
      // Update expertise in the backend
      updateExpertise(updatedAreas);
    }
  };

  // Handle expertise removal
  const handleRemoveExpertise = (expertise) => {
    if (user.mentorshipAreas && user.mentorshipAreas.includes(expertise)) {
      const updatedAreas = user.mentorshipAreas.filter(area => area !== expertise);
      
      // Update expertise in the backend
      updateExpertise(updatedAreas);
    }
  };

  // Update expertise areas via API
  const updateExpertise = async (expertiseAreas) => {
    try {
      setSaving(true);
      await axios.put(`http://localhost:5000/api/users/${user._id}/expertise`, 
        { expertiseAreas },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      // Update local state
      user.mentorshipAreas = expertiseAreas;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating expertise:', error);
      setSaveError('Failed to update expertise areas. Please try again.');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setSaveError(null);
      
      // Create form data for profile update
      const formData = new FormData();
      formData.append('name', profileForm.name);
      
      // Add profile details
      const profileDetails = {
        bio: profileForm.bio,
        currentPosition: profileForm.currentPosition,
        location: profileForm.location,
        socialLinks: {
          linkedin: profileForm.linkedin
        }
      };
      
      formData.append('profileDetails', JSON.stringify(profileDetails));
      
      // Add photo if changed
      if (profilePhoto) {
        formData.append('profilePhoto', profilePhoto);
      }
      
      // Send to the backend
      const response = await axios.put(
        `http://localhost:5000/api/users/${user._id}`, 
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Update the user context with the new data
      if (response.data) {
        // If you have a method to update user context, use it here
        // updateUserContext(response.data);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Add this function to handle settings changes:
  const updateProfileSettings = async (newSettings) => {
    try {
      setSaving(true);
      
      await axios.put(
        `http://localhost:5000/api/users/${user._id}/settings`, 
        newSettings,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Navigation items
  const navItems = [
    { title: "Overview", id: "overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { title: "Mentees", id: "mentees", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { title: "Requests", id: "requests", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
    { title: "Office Hours", id: "office-hours", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { title: "My Profile", id: "profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }
  ];
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-blue-900 text-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <span className="text-lg font-bold">Novanest</span>}
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-blue-800">
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <nav className="mt-6">
          {navItems.map((item, index) => (
            <button 
              key={index} 
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center w-full px-4 py-3 transition-colors ${
                activeTab === item.id ? 'bg-blue-800' : 'hover:bg-blue-800'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {sidebarOpen && <span className="ml-3">{item.title}</span>}
            </button>
          ))}
        </nav>
        
        {sidebarOpen && user && (
          <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-blue-800">
            <div className="flex items-center">
              <img 
                src={user.profileDetails?.profilePhoto || "/avatar-placeholder.png"} 
                alt="Profile" 
                className="h-10 w-10 rounded-full"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "/avatar-placeholder.png";
                }}
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-200">{user.name}</p>
                <p className="text-xs text-gray-400">Mentor</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Mentor Dashboard</h1>
          <div className="flex items-center">
            <Link 
              to="/profile"
              className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
            >
              My Profile
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {activeTab === 'overview' && (
            <>
              {/* Metrics Overview */}
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Your Mentor Impact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metrics Cards */}
                  <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Active Mentees</h3>
                    <p className="text-2xl font-bold text-gray-800">{metrics.totalMentees}</p>
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                      Growing your impact
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-green-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Mentor Requests</h3>
                    <p className="text-2xl font-bold text-gray-800">{metrics.activeRequests}</p>
                    <div className="mt-2 text-xs text-blue-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      View pending requests
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-purple-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sessions</h3>
                    <p className="text-2xl font-bold text-gray-800">{metrics.mentorshipSessions}</p>
                    <div className="mt-2 text-xs text-purple-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Schedule a session
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-yellow-500">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Impact Score</h3>
                    <p className="text-2xl font-bold text-gray-800">{metrics.impactScore}</p>
                    <div className="mt-2 text-xs text-yellow-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Based on activity
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Recent Activity */}
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Recent Activity</h2>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flow-root">
                      <ul className="-my-5 divide-y divide-gray-200">
                        {activeMentorships.slice(0, 3).map((mentorship, idx) => (
                          <li key={mentorship._id || idx} className="py-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <img 
                                  className="h-10 w-10 rounded-full"
                                  src={mentorship.mentee?.profilePhoto || "/avatar-placeholder.png"}
                                  alt=""
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {mentorship.mentee?.name || 'Entrepreneur'}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  Session scheduled for {format(new Date(mentorship.nextSession || Date.now()), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div>
                                <button 
                                  className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 text-sm leading-5 font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
                                  onClick={() => {/* Handle view action */}}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                        {activeMentorships.length === 0 && (
                          <li className="py-4">
                            <p className="text-center text-gray-500">No recent activity</p>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Potential Mentees Section */}
              <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Potential Mentee Matches</h2>
                  <button onClick={() => setActiveTab('mentees')} className="text-blue-600 text-sm hover:underline">View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {matchedEntrepreneurs.slice(0, 3).map(({ entrepreneur, matchPercentage }) => (
                    entrepreneur && (
                      <div key={entrepreneur._id} className="bg-white shadow-sm hover:shadow-md transition-all duration-200 rounded-lg p-5 border border-gray-100">
                        <div className="flex items-start">
                          <img
                            src={entrepreneur.profileDetails?.profilePhoto || "/avatar-placeholder.png"}
                            alt={entrepreneur.name} 
                            className="h-12 w-12 rounded-full mr-4 object-cover"
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = "/avatar-placeholder.png";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{entrepreneur.name || 'N/A'}</h3>
                            <div className="flex items-center mb-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${matchPercentage || 0}%` }}></div>
                              </div>
                              <span className="ml-2 text-sm text-gray-600 whitespace-nowrap">{matchPercentage?.toFixed(0) || 0}% Match</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{entrepreneur.profileDetails?.bio || 'No bio available'}</p>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {entrepreneur.startupDetails?.industry || 'Tech'}
                          </span>
                          <Link to={`/entrepreneur/${entrepreneur._id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View Profile
                          </Link>
                        </div>
                      </div>
                    )
                  ))}
                  {matchedEntrepreneurs.length === 0 && (
                    <div className="col-span-3 bg-white shadow-sm rounded-lg p-6 text-center">
                      <p className="text-gray-500">No potential mentees found</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Mentees Tab */}
          {activeTab === 'mentees' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Mentees</h2>
                <p className="text-gray-600 mt-1">All entrepreneurs you're currently mentoring.</p>
              </div>
              
              {/* Active Mentees */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Active Mentorships</h3>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {activeMentorships.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mentee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Startup
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Industry
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stage
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Next Session
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {activeMentorships.map((mentorship) => (
                            <tr key={mentorship._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <img
                                      className="h-10 w-10 rounded-full object-cover"
                                      src={mentorship.mentee?.profilePhoto || "/avatar-placeholder.png"}
                                      alt=""
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "/avatar-placeholder.png";
                                      }}
                                    />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {mentorship.mentee?.name || 'Entrepreneur'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {mentorship.mentee?.email || 'No email available'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{mentorship.startup?.name || 'Unknown'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {mentorship.startup?.industry || 'Tech'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{mentorship.startup?.stage || 'Early'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mentorship.nextSession ? format(new Date(mentorship.nextSession), 'MMM d, yyyy') : 'Not scheduled'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-3">
                                  <button 
                                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                                    onClick={() => {/* Handle message action */}}
                                  >
                                    Message
                                  </button>
                                  <button 
                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                    onClick={() => {/* Handle schedule action */}}
                                  >
                                    Schedule
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">You don't have any active mentees yet.</p>
                      <button className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Browse Potential Mentees
                      </button>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Potential Mentees */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Recommended Matches</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {matchedEntrepreneurs.map(({ entrepreneur, matchPercentage }) => (
                    entrepreneur && (
                      <div key={entrepreneur._id} className="bg-white shadow-sm hover:shadow-md transition-all duration-200 rounded-lg p-5 border border-gray-100">
                        <div className="flex items-start">
                          <img
                            src={entrepreneur.profileDetails?.profilePhoto || "/avatar-placeholder.png"}
                            alt={entrepreneur.name} 
                            className="h-12 w-12 rounded-full mr-4 object-cover"
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = "/avatar-placeholder.png";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{entrepreneur.name || 'N/A'}</h3>
                            <div className="flex items-center mb-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${matchPercentage || 0}%` }}></div>
                              </div>
                              <span className="ml-2 text-sm text-gray-600 whitespace-nowrap">{matchPercentage?.toFixed(0) || 0}% Match</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{entrepreneur.profileDetails?.bio || 'No bio available'}</p>
                        <div className="mt-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {entrepreneur.startupDetails?.industry || 'Tech'}
                          </span>
                          {entrepreneur.startupDetails?.stage && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {entrepreneur.startupDetails.stage}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex justify-between">
                          <Link to={`/entrepreneur/${entrepreneur._id}`} className="text-blue-600 text-sm font-medium hover:text-blue-800">
                            View Profile
                          </Link>
                          <button className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Offer Mentorship
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                  {matchedEntrepreneurs.length === 0 && (
                    <div className="col-span-full bg-white shadow-sm rounded-lg p-6 text-center">
                      <p className="text-gray-500">No potential mentees found based on your expertise.</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Mentorship Requests</h2>
                <p className="text-gray-600 mt-1">Review and respond to entrepreneurs seeking your guidance.</p>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {mentorshipRequests.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {mentorshipRequests.map((request) => (
                      <li key={request._id} className="p-5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <img 
                              className="h-12 w-12 rounded-full object-cover"
                              src={request.entrepreneur?.profilePhoto || "/avatar-placeholder.png"}
                              alt=""
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/avatar-placeholder.png";
                              }}
                            />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{request.entrepreneur?.name || 'Entrepreneur'}</h3>
                              <p className="text-sm text-gray-600 mt-1">{request.entrepreneur?.startupDetails?.name || 'Startup'}</p>
                              
                              <div className="mt-2 space-y-2">
                                <p className="text-sm text-gray-800 font-medium">Request Message:</p>
                                <blockquote className="text-sm text-gray-600 border-l-4 border-gray-200 pl-3 italic">
                                  {request.message || "I'd like to request mentorship for my startup."}
                                </blockquote>
                                
                                <div className="flex space-x-2 mt-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {request.entrepreneur?.startupDetails?.industry || 'Tech'}
                                  </span>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {request.entrepreneur?.startupDetails?.stage || 'Early Stage'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2">
                            <p className="text-xs text-gray-500">
                              Requested {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : 'Recently'}
                            </p>
                            <div className="flex space-x-2">
                              <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Accept
                              </button>
                              <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                Decline
                              </button>
                              <Link 
                                to={`/entrepreneur/${request.entrepreneur?._id}`} 
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                              >
                                View Profile
                              </Link>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No mentorship requests</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You don't have any pending mentorship requests.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Office Hours Tab */}
          {activeTab === 'office-hours' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Office Hours</h2>
                <p className="text-gray-600 mt-1">Set your availability for mentorship sessions.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Calendar Column */}
                <div className="lg:col-span-3">
                  <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">Your Schedule</h3>
                      <div className="space-x-2">
                        <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                          Previous
                        </button>
                        <span className="text-sm font-medium text-gray-600">March 2025</span>
                        <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                          Next
                        </button>
                      </div>
                    </div>
                    
                    {/* Calendar Component (Simplified) */}
                    <div className="p-4">
                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mt-2">
                        {[...Array(31)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`aspect-square p-1 border rounded-md ${
                              i % 7 === 0 || i % 7 === 6 ? 'bg-gray-50' : ''
                            } ${
                              i === 14 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="h-full flex flex-col justify-between">
                              <span className="text-sm font-medium">{i + 1}</span>
                              {i === 10 && (
                                <div className="mt-1">
                                  <span className="block text-[10px] p-0.5 bg-blue-100 text-blue-800 rounded">
                                    2:00 PM
                                  </span>
                                </div>
                              )}
                              {i === 14 && (
                                <div className="mt-1">
                                  <span className="block text-[10px] p-0.5 bg-blue-100 text-blue-800 rounded">
                                    4:30 PM
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2 items-center">
                          <div className="w-4 h-4 bg-blue-100 rounded-sm border border-blue-300"></div>
                          <span className="text-sm text-gray-600">Available</span>
                        </div>
                        <div className="flex space-x-2 items-center">
                          <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                          <span className="text-sm text-gray-600">Booked</span>
                        </div>
                        <button className="text-sm text-blue-600 font-medium hover:text-blue-800">
                          Add Session
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Upcoming Sessions */}
                  <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-6">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">Upcoming Sessions</h3>
                    </div>
                    <div className="p-4">
                      {activeMentorships.filter(m => m.nextSession).length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {activeMentorships.filter(m => m.nextSession).map((mentorship, idx) => (
                            <div key={idx} className="py-3 flex justify-between items-center">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <img 
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={mentorship.mentee?.profilePhoto || "/avatar-placeholder.png"}
                                    alt=""
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "/avatar-placeholder.png";
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {mentorship.mentee?.name || 'Entrepreneur'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(mentorship.nextSession), 'MMMM d, yyyy • h:mm a')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                  Reschedule
                                </button>
                                <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                  Join Meeting
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">No upcoming sessions scheduled</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Settings Column */}
                <div className="lg:col-span-2">
                  <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">Availability Settings</h3>
                    </div>
                    <div className="p-4">
                      <form>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="session-length" className="block text-sm font-medium text-gray-700">
                              Session Length
                            </label>
                            <select 
                              id="session-length" 
                              name="session-length" 
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                              <option>30 minutes</option>
                              <option>45 minutes</option>
                              <option>60 minutes</option>
                              <option>90 minutes</option>
                            </select>
                          </div>
                          
                          <div>
                            <label htmlFor="buffer-time" className="block text-sm font-medium text-gray-700">
                              Buffer Between Meetings
                            </label>
                            <select 
                              id="buffer-time" 
                              name="buffer-time" 
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                              <option>No buffer</option>
                              <option>5 minutes</option>
                              <option>10 minutes</option>
                              <option>15 minutes</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Weekly Availability
                            </label>
                            <div className="space-y-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                                <div key={day} className="flex items-center justify-between">
                                  <span className="text-sm text-gray-700">{day}</span>
                                  <div className="flex space-x-2">
                                    <select className="block w-24 pl-2 pr-6 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md">
                                      <option>9:00 AM</option>
                                      <option>10:00 AM</option>
                                      <option>11:00 AM</option>
                                      {/* More options */}
                                    </select>
                                    <span className="text-sm text-gray-500 flex items-center">to</span>
                                    <select className="block w-24 pl-2 pr-6 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md">
                                      <option>5:00 PM</option>
                                      <option>6:00 PM</option>
                                      <option>7:00 PM</option>
                                      {/* More options */}
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium text-gray-700">Time Zone</h4>
                              <span className="text-xs text-gray-500">Current: Eastern Time (ET)</span>
                            </div>
                            <select 
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                              <option>Eastern Time (ET)</option>
                              <option>Central Time (CT)</option>
                              <option>Mountain Time (MT)</option>
                              <option>Pacific Time (PT)</option>
                              {/* More options */}
                            </select>
                          </div>
                          
                          <div className="flex justify-end pt-4">
                            <button 
                              type="button" 
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Save Settings
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                  
                  {/* Quick Links */}
                  <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-6">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-3 rounded-md border border-gray-300 text-sm hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Generate Meeting Link
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        
                        <button className="w-full flex items-center justify-between p-3 rounded-md border border-gray-300 text-sm hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Block Out Time
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        
                        <button className="w-full flex items-center justify-between p-3 rounded-md border border-gray-300 text-sm hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share Calendar
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
  <>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
      <p className="text-gray-600 mt-1">Manage your mentor profile and expertise.</p>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile Information */}
      <div className="lg:col-span-2">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Profile Information</h3>
          </div>
          <div className="p-5">
            <form className="space-y-5" onSubmit={handleProfileSubmit}>
  {saveSuccess && (
    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md">
      Profile updated successfully!
    </div>
  )}
  
  {saveError && (
    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
      {saveError}
    </div>
  )}

  <div className="flex flex-col md:flex-row gap-5">
    <div className="flex-1">
      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
        Full Name
      </label>
      <input
        type="text"
        id="name"
        name="name"
        value={profileForm.name}
        onChange={handleProfileChange}
        required
        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>
    <div className="flex-1">
      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
        Email Address
      </label>
      <input
        type="email"
        id="email"
        name="email"
        defaultValue={user?.email}
        disabled
        className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
    </div>
  </div>
  
  <div>
    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
      Professional Bio
    </label>
    <textarea
      id="bio"
      name="bio"
      rows={4}
      value={profileForm.bio}
      onChange={handleProfileChange}
      className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      placeholder="Share your professional background, expertise, and mentorship philosophy..."
    ></textarea>
    <p className="mt-1 text-xs text-gray-500">Brief bio that appears on your public profile</p>
  </div>
  
  <div className="flex flex-col md:flex-row gap-5">
    <div className="flex-1">
      <label htmlFor="currentPosition" className="block text-sm font-medium text-gray-700 mb-1">
        Current Position
      </label>
      <input
        type="text"
        id="currentPosition"
        name="currentPosition"
        value={profileForm.currentPosition}
        onChange={handleProfileChange}
        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="e.g. CEO at TechVentures"
      />
    </div>
    <div className="flex-1">
      <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
        Location
      </label>
      <input
        type="text"
        id="location"
        name="location"
        value={profileForm.location}
        onChange={handleProfileChange}
        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="e.g. San Francisco, CA"
      />
    </div>
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      LinkedIn Profile
    </label>
    <div className="mt-1 flex rounded-md shadow-sm">
      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
        linkedin.com/in/
      </span>
      <input
        type="text"
        name="linkedin"
        value={profileForm.linkedin}
        onChange={handleProfileChange}
        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
        placeholder="yourprofile"
      />
    </div>
  </div>
  
  <div className="flex justify-end">
    <button
      type="submit"
      disabled={saving}
      className={`inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {saving ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </>
      ) : 'Save Changes'}
    </button>
  </div>
</form>
          </div>
        </div>
        
        {/* Expertise Areas */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-6">
  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
    <h3 className="text-lg font-semibold text-gray-800">Areas of Expertise</h3>
    <div className="flex items-center">
      <input
        type="text"
        value={expertiseInput}
        onChange={(e) => setExpertiseInput(e.target.value)}
        placeholder="Add expertise..."
        className="text-sm border-gray-300 rounded-md mr-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button 
        type="button"
        onClick={() => {
          if (expertiseInput.trim()) {
            handleAddExpertise(expertiseInput.trim());
            setExpertiseInput('');
          }
        }}
        className="text-sm text-blue-600 font-medium hover:text-blue-800 whitespace-nowrap"
      >
        Add
      </button>
    </div>
  </div>
  <div className="p-5">
    <p className="text-sm text-gray-600 mb-4">
      Select areas where you can provide the most value to entrepreneurs.
    </p>
    
    <div className="flex flex-wrap gap-2">
      {user?.mentorshipAreas?.map((area, index) => (
        <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
          {area}
          <button 
            className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
            onClick={() => handleRemoveExpertise(area)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </span>
      ))}
      {(!user?.mentorshipAreas || user.mentorshipAreas.length === 0) && (
        <p className="text-gray-500 italic">No expertise areas added yet.</p>
      )}
    </div>
    
    <div className="mt-5">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Suggested Expertise Areas
      </label>
      <div className="flex flex-wrap gap-2 mt-2">
        {['Product Strategy', 'Fundraising', 'Marketing', 'Sales', 'Operations', 'Tech Development', 
          'Team Building', 'Financial Modeling', 'Market Research', 'Business Development'].map((area, idx) => (
          <button 
            key={idx}
            onClick={() => handleAddExpertise(area)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
          >
            + {area}
          </button>
        ))}
      </div>
    </div>
  </div>
</div>
      </div>
      
      {/* Profile Photo & Settings */}
      <div className="lg:col-span-1">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
  <div className="p-4 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800">Profile Photo</h3>
  </div>
  <div className="p-5 text-center">
    <div className="mb-5 flex justify-center">
      <div className="relative">
        <img
          src={photoPreview || user?.profileDetails?.profilePhoto || "/avatar-placeholder.png"}
          alt="Profile"
          className="h-32 w-32 rounded-full object-cover border-4 border-white shadow"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/avatar-placeholder.png";
          }}
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
    <p className="text-sm text-gray-600">Upload a professional photo</p>
    <p className="text-xs text-gray-500 mt-1">JPG, GIF or PNG. 1MB max.</p>
    <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      accept="image/*"
      onChange={handlePhotoChange}
    />
    <button
      type="button"
      onClick={() => fileInputRef.current.click()}
      className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
    >
      Upload New Photo
    </button>
    {profilePhoto && (
      <div className="mt-2">
        <button
          type="button"
          onClick={async () => {
            try {
              setSaving(true);
              
              // Create form data
              const formData = new FormData();
              formData.append('profilePhoto', profilePhoto);
              
              // Send to backend
              await axios.put(
                `http://localhost:5000/api/users/${user._id}`, 
                formData,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data',
                  },
                }
              );
              
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
            } catch (error) {
              console.error('Error uploading photo:', error);
              setSaveError('Failed to upload photo. Please try again.');
            } finally {
              setSaving(false);
            }
          }}
          className="ml-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          disabled={saving}
        >
          {saving ? 'Uploading...' : 'Save Photo'}
        </button>
      </div>
    )}
  </div>
</div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-6">
  <div className="p-4 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800">Profile Settings</h3>
  </div>
  <div className="p-5">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Profile Visibility</h4>
          <p className="text-xs text-gray-500">Allow entrepreneurs to find you</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button 
            type="button" 
            className={`${profileSettings.visibility ? 'bg-green-500' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            role="switch" 
            aria-checked={profileSettings.visibility}
            onClick={() => {
              const newSettings = {
                ...profileSettings,
                visibility: !profileSettings.visibility
              };
              setProfileSettings(newSettings);
              updateProfileSettings(newSettings);
            }}
          >
            <span className="sr-only">Use setting</span>
            <span 
              aria-hidden="true" 
              className={`${profileSettings.visibility ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            ></span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
          <p className="text-xs text-gray-500">Receive mentorship requests via email</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button 
            type="button" 
            className={`${profileSettings.emailNotifications ? 'bg-green-500' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            role="switch" 
            aria-checked={profileSettings.emailNotifications}
            onClick={() => {
              const newSettings = {
                ...profileSettings,
                emailNotifications: !profileSettings.emailNotifications
              };
              setProfileSettings(newSettings);
              updateProfileSettings(newSettings);
            }}
          >
            <span className="sr-only">Use setting</span>
            <span 
              aria-hidden="true" 
              className={`${profileSettings.emailNotifications ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            ></span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Availability Status</h4>
          <p className="text-xs text-gray-500">Set whether you're accepting new mentees</p>
        </div>
        <select 
          className="block pl-3 pr-9 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          value={profileSettings.availabilityStatus}
          onChange={(e) => {
            const newSettings = {
              ...profileSettings,
              availabilityStatus: e.target.value
            };
            setProfileSettings(newSettings);
            updateProfileSettings(newSettings);
          }}
        >
          <option value="open">Open to New Mentees</option>
          <option value="limited">Limited Availability</option>
          <option value="closed">Not Accepting</option>
        </select>
      </div>
      
      {(saveSuccess || saveError) && (
        <div className={`p-3 rounded-md ${saveSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {saveSuccess ? 'Settings saved successfully!' : saveError}
        </div>
      )}
    </div>
  </div>
</div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Preview Profile</h3>
          </div>
          <div className="p-5 text-center">
            <p className="text-sm text-gray-600 mb-4">See how your profile appears to entrepreneurs</p>
            <Link 
              to={`/mentor/${user?._id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              target="_blank"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Public Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  </>
)}
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;