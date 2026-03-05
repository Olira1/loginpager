const DemoCredentials = () => {
  const accounts = [
    {
      role: "School Head",
      name: "Adunya",
      email: "adu@gmail.com",
      password: "#Password1",
    },
    {
      role: "Registrar",
      email: "yos@gmail.com",
      password: "#Password1",
    },
    {
      role: "Store House",
      email: "beti@gmail.com",
      password: "#Password1",
    },
    {
      role: "Teacher",
      email: ["TCH202600004", "TCH202600005", "TCH202600003", "TCH202600001", "TCH202600002"],
      password: "#Password1",
    },
    {
      role: "Student",
      email: ["STU202600005", "STU202600004"],
      password: "#Password1",
    },
    {
      role: "Parent",
      credentials: [
        { email: "0956789012", password: "cOj8Peb!y#BT" },
        { email: "0945678901", password: "E17LsuH$1Ons" },
      ],
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto mt-6 p-5 rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        Demo Accounts
      </h3>

      <div className="space-y-4">
        {accounts.map((acc, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-white border border-gray-100"
          >
            <p className="font-medium text-blue-600 mb-1">
              {acc.role}
              {acc.name && <span className="text-gray-600 font-normal"> ({acc.name})</span>}
            </p>

            {/* Parent: multiple credentials with different passwords */}
            {acc.credentials ? (
              acc.credentials.map((cred, i) => (
                <p key={i} className="text-sm text-gray-700">
                  📧 {cred.email} &nbsp; 🔑 {cred.password}
                </p>
              ))
            ) : Array.isArray(acc.email) ? (
              <>
                {acc.email.map((mail, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    📧 {mail}
                  </p>
                ))}
                <p className="text-sm text-gray-700">🔑 {acc.password}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">📧 {acc.email}</p>
                <p className="text-sm text-gray-700">🔑 {acc.password}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DemoCredentials;
