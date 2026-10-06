import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_BASE_URL = 'http://localhost:8080/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isLogin) {
      if (!username.trim() || !password) {
        setErrorMsg('Vui lòng nhập Username và Password.');
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok && data.success === 1) {
          if (data.data) {
            localStorage.setItem(
              'user',
              JSON.stringify(data.data)
            );
          }

          localStorage.setItem(
            'isLoggedIn',
            'true'
          );

          navigate('/dashboard');
        } else {
          setErrorMsg(
            data.message ||
              'Tên đăng nhập hoặc mật khẩu không chính xác.'
          );
        }
      } catch (err) {
        setErrorMsg(
          'Không thể kết nối đến máy chủ backend.'
        );
      } finally {
        setLoading(false);
      }
    } else {
      if (
        !displayName.trim() ||
        !email.trim() ||
        !username.trim() ||
        !password ||
        !confirmPassword
      ) {
        setErrorMsg(
          'Vui lòng điền đầy đủ tất cả các trường.'
        );
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg(
          'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.'
        );
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              display_name: displayName,
              email,
              username,
              password,
            }),
          }
        );

        const data = await response.json();

        if (
          response.ok &&
          (
            response.status === 201 ||
            response.status === 200 ||
            data.success === 1
          )
        ) {
          setSuccessMsg(
            data.message ||
              'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.'
          );

          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        } else {
          setErrorMsg(
            data.message ||
              'Đăng ký thất bại. Tên tài khoản hoặc email có thể đã tồn tại.'
          );
        }
      } catch (err) {
        setErrorMsg(
          'Không thể kết nối đến máy chủ backend.'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={styles.root}>
      <style>
        {`
          @media (max-width: 820px) {
            .split-card {
              flex-direction: column !important;
              width: 100% !important;
              max-width: 440px !important;
              max-height: none !important;
              overflow-y: auto !important;
            }

            .banner-section {
              padding: 20px !important;
              min-height: 150px !important;
              flex: none !important;
              border-right: none !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .banner-body {
              margin: 18px 0 !important;
            }

            .banner-title {
              font-size: 24px !important;
            }

            .form-section {
              padding: 20px !important;
            }
          }

          @media (max-width: 420px) {
            .split-card {
              border-radius: 12px !important;
            }

            .banner-section {
              padding: 16px !important;
              min-height: 130px !important;
            }

            .form-section {
              padding: 16px !important;
            }
          }

          input:focus {
            border-color: #adc6ff !important;
            box-shadow: 0 0 0 2px rgba(173, 198, 255, 0.2) !important;
          }

          .submit-btn:hover:not(:disabled) {
            background-color: #c6d9ff !important;
            transform: translateY(-1px);
          }

          .submit-btn:active:not(:disabled) {
            transform: translateY(0);
          }

          .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}
      </style>

      <div style={styles.bgOverlay} />
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <div
        className="split-card"
        style={styles.splitCard}
      >
        <div
          className="banner-section"
          style={styles.bannerSection}
        >
          <div style={styles.bannerOverlay} />

          <div style={styles.bannerHeader}>
            <div style={styles.logoIcon}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#adc6ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.55a11 11 0 0 1 14 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line
                  x1="12"
                  y1="20"
                  x2="12.01"
                  y2="20"
                />
              </svg>
            </div>
          </div>

          <div
            className="banner-body"
            style={styles.bannerBody}
          >
            <h1
              className="banner-title"
              style={styles.bannerTitle}
            >
              IoT và ứng dụng
            </h1>

            <p style={styles.bannerDesc}>
              Hệ thống quản lý và giám sát thiết bị IoT thông minh
            </p>
          </div>

          <div style={styles.bannerFooter} />
        </div>

        <div
          className="form-section"
          style={styles.formSection}
        >
          <div style={styles.tabContainer}>
            <button
              type="button"
              style={{
                ...styles.tabBtn,
                ...(isLogin
                  ? styles.activeTab
                  : {}),
              }}
              onClick={() => {
                setIsLogin(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Đăng nhập
            </button>

            <button
              type="button"
              style={{
                ...styles.tabBtn,
                ...(!isLogin
                  ? styles.activeTab
                  : {}),
              }}
              onClick={() => {
                setIsLogin(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Đăng ký
            </button>
          </div>

          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>
              {isLogin
                ? 'Đăng nhập'
                : 'Tạo tài khoản'}
            </h2>

            <p style={styles.formSubtitle}>
              {isLogin
                ? 'Nhập thông tin tài khoản của bạn để tiếp tục'
                : 'Điền đầy đủ các thông tin bên dưới'}
            </p>
          </div>

          {errorMsg && (
            <div style={styles.errorAlert}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={styles.successAlert}>
              {successMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={styles.formGroup}
          >
            {!isLogin && (
              <>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>
                    DISPLAY NAME
                  </label>

                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#c2c6d6"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle
                          cx="12"
                          cy="7"
                          r="4"
                        />
                      </svg>
                    </span>

                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) =>
                        setDisplayName(
                          e.target.value
                        )
                      }
                      style={styles.input}
                      placeholder="Nhập tên hiển thị"
                      required
                    />
                  </div>
                </div>

                <div style={styles.inputWrapper}>
                  <label style={styles.label}>
                    EMAIL
                  </label>

                  <div style={styles.inputContainer}>
                    <span style={styles.inputIcon}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#c2c6d6"
                        strokeWidth="2"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      style={styles.input}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div style={styles.inputWrapper}>
              <label style={styles.label}>
                USERNAME
              </label>

              <div style={styles.inputContainer}>
                <span style={styles.inputIcon}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#c2c6d6"
                    strokeWidth="2"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle
                      cx="8.5"
                      cy="7"
                      r="4"
                    />
                    <line
                      x1="20"
                      y1="8"
                      x2="20"
                      y2="14"
                    />
                    <line
                      x1="23"
                      y1="11"
                      x2="17"
                      y2="11"
                    />
                  </svg>
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                    )
                  }
                  style={styles.input}
                  placeholder="Nhập username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>
                PASSWORD
              </label>

              <div style={styles.inputContainer}>
                <span style={styles.inputIcon}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#c2c6d6"
                    strokeWidth="2"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  style={styles.input}
                  placeholder="••••••••"
                  autoComplete={
                    isLogin
                      ? 'current-password'
                      : 'new-password'
                  }
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div style={styles.inputWrapper}>
                <label style={styles.label}>
                  CONFIRM PASSWORD
                </label>

                <div style={styles.inputContainer}>
                  <span style={styles.inputIcon}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c2c6d6"
                      strokeWidth="2"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </span>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    style={styles.input}
                    placeholder="Xác nhận lại mật khẩu"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              style={styles.submitBtn}
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Đang xử lý...'
                  : isLogin
                    ? 'Đăng nhập'
                    : 'Tạo tài khoản'}
              </span>

              {!loading && (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#002e6a"
                  strokeWidth="2.5"
                >
                  <line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                  />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {
  root: {
    position: 'fixed',
    inset: 0,

    width: '100%',
    height: '100%',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#0b1326',

    fontFamily:
      "'Inter', system-ui, -apple-system, sans-serif",

    overflowY: 'auto',
    overflowX: 'hidden',

    boxSizing: 'border-box',

    padding:
      'clamp(12px, 3vw, 24px)',
  },

  bgOverlay: {
    position: 'absolute',
    inset: 0,

    background:
      'linear-gradient(168deg, #0b1326 -21%, rgba(11, 19, 38, 0.95) 50%, #060e20 120%)',

    zIndex: 0,
    pointerEvents: 'none',
  },

  glowTop: {
    position: 'absolute',

    width:
      'clamp(300px, 45vw, 600px)',

    height:
      'clamp(300px, 45vw, 600px)',

    top:
      'clamp(-250px, -20vw, -120px)',

    right:
      'clamp(-150px, -12vw, -60px)',

    borderRadius: '50%',

    background:
      'radial-gradient(circle, rgba(92, 139, 255, 0.12) 0%, rgba(92, 139, 255, 0) 70%)',

    zIndex: 0,
    pointerEvents: 'none',
  },

  glowBottom: {
    position: 'absolute',

    width:
      'clamp(280px, 42vw, 550px)',

    height:
      'clamp(280px, 42vw, 550px)',

    bottom:
      'clamp(-250px, -20vw, -120px)',

    left:
      'clamp(-150px, -12vw, -60px)',

    borderRadius: '50%',

    background:
      'radial-gradient(circle, rgba(70, 120, 255, 0.1) 0%, rgba(70, 120, 255, 0) 70%)',

    zIndex: 0,
    pointerEvents: 'none',
  },

  splitCard: {
    position: 'relative',
    zIndex: 2,

    width: 'min(100%, 860px)',

    maxHeight:
      'min(90vh, 720px)',

    minWidth: 0,

    overflow: 'hidden',

    background:
      'rgba(255, 255, 255, 0.07)',

    boxShadow:
      'inset 0 0 0 1px rgba(255, 255, 255, 0.15), 0px 24px 70px rgba(0, 0, 0, 0.65)',

    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',

    borderRadius:
      'clamp(12px, 1.5vw, 16px)',

    display: 'flex',
    flexDirection: 'row',

    margin: 'auto',

    boxSizing: 'border-box',
  },

  bannerSection: {
    flex: '1 1 0',

    minWidth: 0,

    position: 'relative',

    padding:
      'clamp(24px, 4vw, 40px) clamp(20px, 3.5vw, 36px)',

    background:
      'linear-gradient(135deg, rgba(20, 35, 70, 0.6) 0%, rgba(10, 20, 45, 0.8) 100%)',

    borderRight:
      '1px solid rgba(255, 255, 255, 0.1)',

    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',

    boxSizing: 'border-box',

    overflow: 'hidden',
  },

  bannerOverlay: {
    position: 'absolute',
    inset: 0,

    background:
      'radial-gradient(circle at top left, rgba(173, 198, 255, 0.15), transparent 60%)',

    pointerEvents: 'none',
  },

  bannerHeader: {
    display: 'flex',
    alignItems: 'center',

    gap:
      'clamp(8px, 1vw, 12px)',

    position: 'relative',
    zIndex: 2,
  },

  logoIcon: {
    width:
      'clamp(38px, 4vw, 44px)',

    height:
      'clamp(38px, 4vw, 44px)',

    flexShrink: 0,

    borderRadius: '10px',

    background:
      'rgba(173, 198, 255, 0.12)',

    boxShadow:
      'inset 0 0 0 1px rgba(173, 198, 255, 0.25)',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerBody: {
    position: 'relative',
    zIndex: 2,

    margin:
      'clamp(18px, 3vw, 32px) 0',

    minWidth: 0,
  },

  bannerTitle: {
    margin:
      '0 0 clamp(8px, 1vw, 12px) 0',

    color: '#ffffff',

    fontSize:
      'clamp(22px, 3vw, 28px)',

    fontWeight: 700,

    lineHeight: 1.25,

    overflowWrap: 'break-word',
  },

  bannerDesc: {
    margin: 0,

    color: '#9da6bd',

    fontSize:
      'clamp(12px, 1vw, 14px)',

    lineHeight: 1.6,

    overflowWrap: 'break-word',
  },

  bannerFooter: {
    display: 'flex',

    gap: '10px',

    position: 'relative',
    zIndex: 2,

    flexWrap: 'wrap',
  },

  formSection: {
    flex: '1 1 0',

    minWidth: 0,

    padding:
      'clamp(20px, 3.5vw, 36px) clamp(18px, 3vw, 32px)',

    display: 'flex',
    flexDirection: 'column',

    gap:
      'clamp(12px, 1.5vw, 16px)',

    boxSizing: 'border-box',

    overflowY: 'auto',
    overflowX: 'hidden',
  },

  tabContainer: {
    display: 'flex',

    minWidth: 0,

    background:
      'rgba(0, 0, 0, 0.25)',

    borderRadius: '8px',

    padding: '4px',

    gap: '4px',
  },

  tabBtn: {
    flex: 1,

    minWidth: 0,

    padding: '8px 0',

    background: 'transparent',

    border: 'none',

    borderRadius: '6px',

    color: '#9da6bd',

    fontSize:
      'clamp(11px, 1vw, 13px)',

    fontWeight: 600,

    cursor: 'pointer',

    transition: 'all 0.2s ease',
  },

  activeTab: {
    background:
      'rgba(173, 198, 255, 0.15)',

    color: '#dae2fd',
  },

  formHeader: {
    marginTop: '4px',
    minWidth: 0,
  },

  formTitle: {
    margin: 0,

    color: '#dae2fd',

    fontSize:
      'clamp(16px, 1.5vw, 18px)',

    fontWeight: 600,
  },

  formSubtitle: {
    margin: '4px 0 0 0',

    color: '#9da6bd',

    fontSize:
      'clamp(10px, 0.9vw, 12px)',

    lineHeight: 1.5,
  },

  errorAlert: {
    padding:
      'clamp(8px, 1vw, 10px) clamp(10px, 1.2vw, 14px)',

    background:
      'rgba(255, 77, 79, 0.15)',

    border:
      '1px solid rgba(255, 77, 79, 0.3)',

    borderRadius: '6px',

    color: '#ff7875',

    fontSize:
      'clamp(11px, 0.9vw, 13px)',

    textAlign: 'center',

    overflowWrap: 'break-word',
  },

  successAlert: {
    padding:
      'clamp(8px, 1vw, 10px) clamp(10px, 1.2vw, 14px)',

    background:
      'rgba(82, 196, 26, 0.15)',

    border:
      '1px solid rgba(82, 196, 26, 0.3)',

    borderRadius: '6px',

    color: '#73d13d',

    fontSize:
      'clamp(11px, 0.9vw, 13px)',

    textAlign: 'center',

    overflowWrap: 'break-word',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',

    gap:
      'clamp(9px, 1vw, 12px)',

    width: '100%',
    minWidth: 0,
  },

  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',

    gap: '4px',

    width: '100%',
    minWidth: 0,
  },

  label: {
    color: '#c2c6d6',

    fontSize:
      'clamp(10px, 0.8vw, 11px)',

    fontWeight: 700,

    letterSpacing: '0.6px',
  },

  inputContainer: {
    position: 'relative',

    display: 'flex',
    alignItems: 'center',

    width: '100%',
    minWidth: 0,
  },

  inputIcon: {
    position: 'absolute',

    left:
      'clamp(9px, 1vw, 12px)',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    pointerEvents: 'none',

    zIndex: 1,
  },

  input: {
    width: '100%',

    height:
      'clamp(38px, 3.5vw, 40px)',

    padding:
      '0 clamp(10px, 1.2vw, 16px) 0 clamp(34px, 3.5vw, 40px)',

    background:
      'rgba(0, 0, 0, 0.25)',

    border:
      '1px solid rgba(255, 255, 255, 0.15)',

    borderRadius: '6px',

    color: '#ffffff',

    fontSize:
      'clamp(11px, 0.9vw, 13px)',

    outline: 'none',

    boxSizing: 'border-box',

    transition: 'all 0.2s ease',

    minWidth: 0,
  },

  submitBtn: {
    marginTop: '6px',

    width: '100%',

    height:
      'clamp(40px, 3.5vw, 42px)',

    background: '#adc6ff',

    border: 'none',

    borderRadius: '6px',

    color: '#002e6a',

    fontWeight: 700,

    fontSize:
      'clamp(12px, 1vw, 14px)',

    cursor: 'pointer',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    gap: '8px',

    boxShadow:
      '0 4px 14px rgba(173, 198, 255, 0.15)',

    transition: 'all 0.2s ease',

    flexShrink: 0,
  },
};

export default LoginPage;