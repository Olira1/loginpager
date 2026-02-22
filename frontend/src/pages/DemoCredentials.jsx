const DemoCredentials = () => {
  const accounts = [
    {
      role: "School Head",
      email: "kebede@aass.edu.et",
      password: "password123",
    },
    {
      role: "Class Head",
      email: "henok@aass.edu.et",
      password: "password123",
    },
    {
      role: "Teacher",
      email: ["yohannes@aass.edu.et", "sara@aass.edu.et"],
      password: "password123",
    },
    {
      role: "Student",
      email: "kidist.a@student.aass.edu.et",
      password: "password123",
    },
    {
      role: "Parent",
      email: "alemayehu.t@parent.aass.edu.et",
      password: "password123",
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
            <p className="font-medium text-blue-600 mb-1">{acc.role}</p>

            {Array.isArray(acc.email) ? (
              acc.email.map((mail, i) => (
                <p key={i} className="text-sm text-gray-700">
                  📧 {mail}
                </p>
              ))
            ) : (
              <p className="text-sm text-gray-700">📧 {acc.email}</p>
            )}

            <p className="text-sm text-gray-700">🔑 {acc.password}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DemoCredentials;
